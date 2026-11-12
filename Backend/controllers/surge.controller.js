const surgePricingService = require("../services/surgePricing.service");
const AdminAuditLog = require("../models/AdminAuditLog.model");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

/**
 * TASK 3 Endpoint: Calculate dynamic delivery fee before checkout
 * @route   POST /api/orders/calculate-delivery-fee
 * @route   POST /api/surge/calculate
 * @access  Public / Private
 */
const calculateDeliveryFee = asyncHandler(async (req, res) => {
    const {
        restaurantId,
        restaurantCoordinates,
        customerCoordinates,
        subtotal = 0,
        simulatedHour = null,
    } = req.body;

    const breakdown = await surgePricingService.calculateDeliveryFee({
        restaurantId,
        restaurantCoordinates,
        customerCoordinates,
        subtotal,
        simulatedHour,
    });

    return sendSuccess(res, 200, "Delivery fee calculated dynamically", {
        pricingBreakdown: breakdown,
    });
});

/**
 * TASK 3 Admin Endpoint: Get current surge pricing configuration & live demand metrics
 * @route   GET /api/admin/surge-settings
 * @access  Private (admin)
 */
const getSurgeSettings = asyncHandler(async (req, res) => {
    const settings = await surgePricingService.getOrCreateSurgeSettings();
    const liveDemand = await surgePricingService.evaluateLiveDemand(settings);
    const peakHourStatus = surgePricingService.evaluatePeakHour(settings, new Date());

    return sendSuccess(res, 200, "Surge pricing settings fetched", {
        settings,
        liveDemand,
        peakHourStatus,
    });
});

/**
 * TASK 3 Admin Endpoint: Update surge pricing settings
 * @route   PUT /api/admin/surge-settings
 * @access  Private (admin)
 */
const updateSurgeSettings = asyncHandler(async (req, res) => {
    const settings = await surgePricingService.getOrCreateSurgeSettings();

    const {
        isEnabled,
        baseDeliveryFee,
        perKmRate,
        freeDeliveryThreshold,
        peakHours,
        demandMultipliers,
        demandThresholds,
        manualDemandOverride,
        regionalConfigs,
    } = req.body;

    if (isEnabled !== undefined) settings.isEnabled = Boolean(isEnabled);
    if (baseDeliveryFee !== undefined) settings.baseDeliveryFee = Number(baseDeliveryFee);
    if (perKmRate !== undefined) settings.perKmRate = Number(perKmRate);
    if (freeDeliveryThreshold !== undefined)
        settings.freeDeliveryThreshold = Number(freeDeliveryThreshold);
    if (peakHours) settings.peakHours = peakHours;
    if (demandMultipliers) settings.demandMultipliers = demandMultipliers;
    if (demandThresholds) settings.demandThresholds = demandThresholds;
    if (manualDemandOverride) settings.manualDemandOverride = manualDemandOverride;
    if (Array.isArray(regionalConfigs)) settings.regionalConfigs = regionalConfigs;

    settings.updatedBy = req.user?._id || null;
    await settings.save();

    if (req.user?._id) {
        await AdminAuditLog.create({
            admin: req.user._id,
            action: "SURGE_SETTINGS_UPDATED",
            targetType: "SurgePricing",
            targetId: settings._id,
            summary: "Updated dynamic surge pricing rules and multipliers",
            details: {
                isEnabled: settings.isEnabled,
                baseDeliveryFee: settings.baseDeliveryFee,
                perKmRate: settings.perKmRate,
                manualDemandOverride: settings.manualDemandOverride,
            },
        });
    }

    const liveDemand = await surgePricingService.evaluateLiveDemand(settings);

    return sendSuccess(res, 200, "Surge pricing settings updated successfully", {
        settings,
        liveDemand,
    });
});

module.exports = {
    calculateDeliveryFee,
    getSurgeSettings,
    updateSurgeSettings,
};

