const jwt = require("jsonwebtoken");

const generateAccessToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            role: user.role,
            email: user.email,
        },
        process.env.JWT_SECRET || "swiggy_prod_jwt_secret_key_2026_enterprise_edition",
        {
            expiresIn: process.env.JWT_EXPIRE || "7d",
        }
    );
};

const generateRefreshToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
        },
        process.env.JWT_REFRESH_SECRET || "swiggy_prod_jwt_refresh_secret_key_2026_enterprise",
        {
            expiresIn: "30d",
        }
    );
};

/**
 * Sets HTTP-only secure cookies and returns token payload
 */
const attachTokenCookies = (res, user) => {
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const cookieExpireDays = Number(process.env.JWT_COOKIE_EXPIRE || 7);
    const isProduction = process.env.NODE_ENV === "production";

    const cookieOptions = {
        expires: new Date(Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        path: "/",
    };

    res.cookie("token", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, {
        ...cookieOptions,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return { accessToken, refreshToken };
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    attachTokenCookies,
};

