const SurgePricing = require("../models/SurgePricing.model");
const Order = require("../models/Order.model");
const DeliveryPartner = require("../models/DeliveryPartner.model");
const Restaurant = require("../models/Restaurant.model");
const { calculateDistanceKm, calculateGeoJsonDistanceKm } = require("../utils/calculateDistance");

/**
 * TASK 3: Dynamic Surge Pricing for Delivery Fees
 *
 * Calculates real-time delivery charges based on:
 * - Current time & configurable peak hours (Lunch: 12 PM–3 PM, Dinner: 7 PM–10 PM)
 * - Active order volume in MongoDB
 * - Available online delivery partners (supply vs. demand ratio)
 * - Regional order volume & regional multiplier rules
 * - Distance between restaurant and customer (Haversine road distance)
 */
class SurgePricingService {
    async getOrCreateSurgeSettings() {
        let settings = await SurgePricing.findOne();
        if (!settings) {
            settings = await SurgePricing.create({
                configName: "Global Dynamic Surge Engine",
                isEnabled: true,
                baseDeliveryFee: 30,
                perKmRate: 8,
                freeDeliveryThreshold: 999,
            });
        }
        return settings;
    }

    /**
     * Determines if the given hour falls into configured Lunch or Dinner peak windows
     */
    evaluatePeakHour(settings, currentDate = new Date()) {
        const currentHour = currentDate.getHours();
        const lunch = settings.peakHours?.lunch;
        const dinner = settings.peakHours?.dinner;

        if (lunch?.enabled && currentHour >= lunch.startHour && currentHour < lunch.endHour) {
            return {
                isPeak: true,
                peakWindowName: `Lunch Peak (${lunch.startHour}:00 - ${lunch.endHour}:00)`,
                peakMultiplier: Number(lunch.multiplier || 1.2),
            };
        }

        if (dinner?.enabled && currentHour >= dinner.startHour && currentHour < dinner.endHour) {
            return {
                isPeak: true,
                peakWindowName: `Dinner Peak (${dinner.startHour}:00 - ${dinner.endHour}:00)`,
                peakMultiplier: Number(dinner.multiplier || 1.3),
            };
        }

        return {
            isPeak: false,
            peakWindowName: "Standard Hours",
            peakMultiplier: 1.0,
        };
    }

    /**
     * Matches coordinates against regional surge zones
     */
    evaluateRegion(settings, targetCoords = [77.5946, 12.9716]) {
        const regions = settings.regionalConfigs || [];
        const [targetLng, targetLat] = targetCoords;

        for (const region of regions) {
            if (!region.isActive || !region.centerCoordinates?.length) continue;
            const [regLng, regLat] = region.centerCoordinates;
            const dist = calculateDistanceKm(targetLat, targetLng, regLat, regLng);
            if (dist <= (region.radiusKm || 8)) {
                return {
                    regionName: region.regionName,
                    regionalMultiplier: Number(region.regionalMultiplier || 1.0),
                    baseFeeOverride: region.baseFeeOverride || null,
                };
            }
        }

        return {
            regionName: "Standard Metro Zone",
            regionalMultiplier: 1.0,
            baseFeeOverride: null,
        };
    }

    /**
     * Calculates live demand level from active orders and available delivery partners
     */
    async evaluateLiveDemand(settings) {
        const activeStatuses = [
            "Order Placed",
            "Restaurant Accepted",
            "Food Preparing",
            "Ready for Pickup",
            "Delivery Partner Assigned",
            "Picked Up",
            "Out for Delivery",
        ];

        const [activeOrdersCount, availablePartnersCount] = await Promise.all([
            Order.countDocuments({ status: { $in: activeStatuses } }),
            DeliveryPartner.countDocuments({ isOnline: true, isAvailable: true }),
        ]);

        // If admin set a manual demand override for testing/simulation, respect it
        if (settings.manualDemandOverride?.enabled) {
            const overrideLevel = settings.manualDemandOverride.level || "Normal";
            const multMap = {
                Normal: settings.demandMultipliers?.normal || 1.0,
                Medium: settings.demandMultipliers?.medium || 1.2,
                High: settings.demandMultipliers?.high || 1.5,
                Extreme: settings.demandMultipliers?.extreme || 2.0,
            };
            return {
                demandLevel: overrideLevel,
                demandMultiplier: multMap[overrideLevel] || 1.0,
                activeOrdersCount,
                availablePartnersCount,
                supplyDemandRatio: Number(
                    (activeOrdersCount / Math.max(1, availablePartnersCount)).toFixed(2)
                ),
            };
        }

        const thresholds = settings.demandThresholds || {
            mediumActiveOrders: 5,
            highActiveOrders: 12,
            extremeActiveOrders: 20,
        };

        const supplyDemandRatio = activeOrdersCount / Math.max(1, availablePartnersCount);

        let demandLevel = "Normal";
        let demandMultiplier = settings.demandMultipliers?.normal || 1.0;

        if (
            activeOrdersCount >= thresholds.extremeActiveOrders ||
            (activeOrdersCount >= 4 && supplyDemandRatio >= 3.0)
        ) {
            demandLevel = "Extreme";
            demandMultiplier = settings.demandMultipliers?.extreme || 2.0;
        } else if (
            activeOrdersCount >= thresholds.highActiveOrders ||
            (activeOrdersCount >= 3 && supplyDemandRatio >= 2.0)
        ) {
            demandLevel = "High";
            demandMultiplier = settings.demandMultipliers?.high || 1.5;
        } else if (
            activeOrdersCount >= thresholds.mediumActiveOrders ||
            (activeOrdersCount >= 2 && supplyDemandRatio >= 1.2)
        ) {
            demandLevel = "Medium";
            demandMultiplier = settings.demandMultipliers?.medium || 1.2;
        }

        return {
            demandLevel,
            demandMultiplier: Number(demandMultiplier),
            activeOrdersCount,
            availablePartnersCount,
            supplyDemandRatio: Number(supplyDemandRatio.toFixed(2)),
        };
    }

    /**
     * Independently calculates the complete delivery fee & order pricing breakdown on the backend
     */
    async calculateDeliveryFee({
        restaurantId,
        restaurantCoordinates,
        customerCoordinates,
        subtotal = 0,
        simulatedHour = null,
    }) {
        const settings = await this.getOrCreateSurgeSettings();

        let restCoords = restaurantCoordinates;
        if (!restCoords && restaurantId) {
            const restaurant = await Restaurant.findById(restaurantId).select("location address");
            if (restaurant?.location?.coordinates) {
                restCoords = restaurant.location.coordinates;
            }
        }
        restCoords = restCoords || [77.5946, 12.9716];
        const custCoords =
            Array.isArray(customerCoordinates) && customerCoordinates.length === 2
                ? customerCoordinates
                : [77.615, 12.965];

        const distanceKm = calculateGeoJsonDistanceKm(restCoords, custCoords);

        const evalDate = new Date();
        if (simulatedHour !== null && simulatedHour !== undefined && !Number.isNaN(Number(simulatedHour))) {
            evalDate.setHours(Number(simulatedHour), 15, 0, 0);
        }

        const peakInfo = this.evaluatePeakHour(settings, evalDate);
        const regionInfo = this.evaluateRegion(settings, custCoords);
        const demandInfo = await this.evaluateLiveDemand(settings);

        const baseDeliveryFee = Number(
            regionInfo.baseFeeOverride ?? settings.baseDeliveryFee ?? 30
        );
        const perKmRate = Number(settings.perKmRate ?? 8);
        // First 2 km included in base fee, perKmRate charged beyond 2 km
        const chargeableDistanceKm = Math.max(0, Number((distanceKm - 2).toFixed(2)));
        const distanceFee = Math.round(chargeableDistanceKm * perKmRate);

        let effectiveSurgeMultiplier = 1.0;
        let finalDemandLevel = demandInfo.demandLevel;

        if (settings.isEnabled) {
            // Combine demand multiplier and peak-hour multiplier, capped at 2.5x
            const highestCoreMultiplier = Math.max(
                demandInfo.demandMultiplier,
                peakInfo.peakMultiplier
            );
            effectiveSurgeMultiplier = Number(
                Math.min(2.5, highestCoreMultiplier * regionInfo.regionalMultiplier).toFixed(2)
            );

            if (effectiveSurgeMultiplier >= 1.8 && finalDemandLevel === "Normal") {
                finalDemandLevel = "Extreme";
            } else if (effectiveSurgeMultiplier >= 1.4 && finalDemandLevel === "Normal") {
                finalDemandLevel = "High";
            } else if (effectiveSurgeMultiplier >= 1.15 && finalDemandLevel === "Normal") {
                finalDemandLevel = "Medium";
            }
        }

        const rawFee = (baseDeliveryFee + distanceFee) * effectiveSurgeMultiplier;
        const deliveryFee = Math.round(rawFee);
        const surgeExtraAmount = Math.max(0, deliveryFee - (baseDeliveryFee + distanceFee));

        return {
            baseDeliveryFee,
            perKmRate,
            distanceKm,
            distanceFee,
            surgeMultiplier: effectiveSurgeMultiplier,
            surgeExtraAmount,
            demandLevel: finalDemandLevel,
            peakHourApplied: peakInfo.peakWindowName,
            isPeakHour: peakInfo.isPeak,
            regionName: regionInfo.regionName,
            regionalMultiplier: regionInfo.regionalMultiplier,
            deliveryFee,
            liveMetrics: {
                activeOrdersCount: demandInfo.activeOrdersCount,
                availablePartnersCount: demandInfo.availablePartnersCount,
                supplyDemandRatio: demandInfo.supplyDemandRatio,
            },
            subtotal: Number(subtotal || 0),
        };
    }
}

module.exports = new SurgePricingService();

