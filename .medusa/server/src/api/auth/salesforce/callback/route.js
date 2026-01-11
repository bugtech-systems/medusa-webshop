"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
async function GET(req, res) {
    try {
        const code = req.query.code;
        const state = req.query.state;
        const error = req.query.error;
        // Default redirect
        let redirectTo = process.env.STORE_FRONTEND_URL || "/";
        // Check for OAuth errors
        if (error) {
            console.error("Salesforce OAuth error:", error, req.query.error_description);
            const errorUrl = new URL(redirectTo);
            errorUrl.searchParams.set("error", "oauth_error");
            errorUrl.searchParams.set("error_code", error);
            return res.redirect(errorUrl.toString());
        }
        if (!code) {
            return res.status(400).json({ message: "Missing authorization code" });
        }
        // Parse state for redirect
        if (state) {
            try {
                const stateData = JSON.parse(Buffer.from(state, "base64").toString());
                redirectTo = stateData.redirectTo || redirectTo;
            }
            catch (e) {
                console.warn("Failed to parse state:", e);
            }
        }
        // Get code verifier
        const codeVerifier = req.cookies?.sf_code_verifier;
        if (!codeVerifier) {
            return res.status(400).json({ message: "Missing authentication session" });
        }
        // Clear PKCE cookie immediately
        res.clearCookie("sf_code_verifier", {
            path: "/",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        });
        // Use the Salesforce service directly
        const salesforceService = req.scope.resolve("Salesforce_Auth");
        const customerService = req.scope.resolve("customer");
        const authIdentityService = req.scope.resolve("auth");
        if (!salesforceService) {
            throw new Error("Salesforce service not available");
        }
        // Authenticate
        const authResult = await salesforceService.authenticate(code, codeVerifier, customerService, authIdentityService);
        if (!authResult.success) {
            console.error("Authentication failed:", authResult.error);
            const errorUrl = new URL(redirectTo);
            errorUrl.searchParams.set("error", "auth_failed");
            if (authResult.error) {
                errorUrl.searchParams.set("error_message", encodeURIComponent(authResult.error));
            }
            return res.redirect(errorUrl.toString());
        }
        // Generate session token
        const jwtSecret = process.env.JWT_SECRET || process.env.MEDUSA_JWT_SECRET;
        if (!jwtSecret) {
            throw new Error("JWT secret not configured");
        }
        console.log(authResult, jwtSecret, 'jwwt');
        const sessionToken = jsonwebtoken_1.default.sign({
            actor_id: authResult.customer.id,
            auth_identity_id: authResult.authIdentity.id,
            actor_type: "customer",
            app_metadata: {
                customer_id: authResult.customer.id
            }
        }, jwtSecret, { expiresIn: "7d" });
        // Set session cookie
        const isProduction = process.env.NODE_ENV === "production";
        const cookieOptions = {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/"
        };
        if (isProduction && process.env.COOKIE_DOMAIN) {
            Object.assign(cookieOptions, { domain: process.env.COOKIE_DOMAIN });
        }
        res.cookie("_medusa_jwt", sessionToken, cookieOptions);
        // Redirect with success
        const successUrl = new URL(redirectTo);
        successUrl.searchParams.set("auth", "success");
        successUrl.searchParams.set("provider", "salesforce");
        if (authResult.customer) {
            successUrl.searchParams.set("customer_id", authResult.customer.id);
        }
        return res.redirect(successUrl.toString());
    }
    catch (error) {
        console.error("Salesforce callback error:", error);
        // Clear cookies on error
        res.clearCookie("sf_code_verifier", {
            path: "/",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        });
        const frontendUrl = process.env.STORE_FRONTEND_URL || "/";
        const errorUrl = new URL(frontendUrl);
        errorUrl.searchParams.set("error", "callback_error");
        errorUrl.searchParams.set("message", encodeURIComponent(error.message));
        return res.redirect(errorUrl.toString());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2F1dGgvc2FsZXNmb3JjZS9jYWxsYmFjay9yb3V0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQU9BLGtCQTZJQztBQS9JRCxnRUFBOEI7QUFFdkIsS0FBSyxVQUFVLEdBQUcsQ0FDdkIsR0FBa0IsRUFDbEIsR0FBbUI7SUFFbkIsSUFBSSxDQUFDO1FBQ0gsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFjLENBQUE7UUFDckMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFlLENBQUE7UUFDdkMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFlLENBQUE7UUFFdkMsbUJBQW1CO1FBQ25CLElBQUksVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLElBQUksR0FBRyxDQUFBO1FBRXRELHlCQUF5QjtRQUN6QixJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1YsT0FBTyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1lBQzVFLE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ3BDLFFBQVEsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUNqRCxRQUFRLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDOUMsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQzFDLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDVixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxD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