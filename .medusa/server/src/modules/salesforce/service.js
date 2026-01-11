"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@medusajs/utils");
const core_flows_1 = require("@medusajs/core-flows");
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const url_1 = require("url");
class SalesforceAuthService {
    constructor(container, config) {
        this.container_ = container;
        this.config_ = {
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            callbackUrl: config.callbackUrl,
            loginUrl: config.sandbox
                ? "https://test.salesforce.com"
                : "https://login.salesforce.com",
            scopes: config.scopes ?? ["api", "refresh_token", "openid", "profile", "email"],
        };
    }
    async authenticate(code, codeVerifier, customerService, authService) {
        /** 1️⃣ Exchange OAuth code for tokens */
        const tokens = await this.exchangeCodeForTokens(code, codeVerifier);
        /** 2️⃣ Fetch Salesforce user profile */
        const user = await this.getUserProfile(tokens.access_token);
        if (!user.email || !user.email_verified) {
            throw new utils_1.MedusaError(utils_1.MedusaError.Types.UNAUTHORIZED, "Salesforce email is not verified");
        }
        /** 3️⃣ Find or create customer */
        const [existingCustomer] = await customerService.listCustomers({ email: user.email });
        let customer = existingCustomer;
        if (!customer) {
            const { result } = await (0, core_flows_1.createCustomersWorkflow)(this.container_).run({
                input: {
                    customersData: [
                        {
                            email: user.email,
                            first_name: user.given_name ?? "",
                            last_name: user.family_name ?? "",
                            has_account: true,
                            metadata: {
                                salesforce_user_id: user.user_id,
                                salesforce_username: user.username,
                                salesforce_org_id: user.organization_id,
                                salesforce_created_at: new Date().toISOString(),
                            },
                        },
                    ],
                },
            });
            customer = result[0];
        }
        else {
            await (0, core_flows_1.updateCustomersWorkflow)(this.container_).run({
                input: {
                    selector: { id: [customer.id] },
                    update: {
                        metadata: {
                            ...(customer.metadata ?? {}),
                            salesforce_user_id: user.user_id,
                            salesforce_username: user.username,
                            salesforce_last_login: new Date().toISOString(),
                        },
                    },
                },
            });
        }
        /** 4️⃣ Find or create AuthIdentity */
        const [existingIdentity] = await authService.listAuthIdentities({
            provider_identities: { provider: "salesforce", entity_id: user.user_id },
        });
        let authIdentity = existingIdentity;
        console.log(authIdentity, 'auth identity');
        if (!authIdentity) {
            const [createdIdentity] = await authService.createAuthIdentities([
                {
                    provider_identities: [{
                            provider: "salesforce",
                            entity_id: user.user_id, // ✅ must not be undefined
                            provider_metadata: {
                                access_token: tokens.access_token,
                                refresh_token: tokens.refresh_token,
                                instance_url: tokens.instance_url,
                                issued_at: tokens.issued_at,
                                profile: {
                                    email: user.email,
                                    name: user.name,
                                    username: user.username,
                                    organization_id: user.organization_id,
                                },
                            },
                        }],
                    app_metadata: {
                        user_id: customer.id,
                        integration: "salesforce",
                        first_login: new Date().toISOString(),
                    },
                },
            ]);
            authIdentity = createdIdentity;
        }
        else {
            // Update provider metadata and link customer if not linked
            const updatePayload = {
                id: authIdentity.id,
                provider_identities: [{
                        provider: "salesforce",
                        entity_id: user.user_id, // ✅ must not be undefined
                        // ...authIdentity.provider_identities,
                        provider_metadata: {
                            // ...authIdentity.provider_identities?.provider_metadata,
                            access_token: tokens.access_token,
                            refresh_token: tokens.refresh_token,
                            instance_url: tokens.instance_url,
                            issued_at: tokens.issued_at,
                        },
                    }],
                app_metadata: {
                    user_id: customer.id,
                    ...(authIdentity.app_metadata ?? {}),
                    last_login: new Date().toISOString(),
                },
            };
            if (!authIdentity?.app_metadata?.user_id) {
                updatePayload.app_metadata.user_id = customer.id;
            }
            // await authService.updateAuthIdentities([updatePayload])
        }
        /** 5️⃣ Return results */
        return {
            success: true,
            customer,
            authIdentity,
            user,
            tokens,
        };
    }
    /* -------------------------- OAuth Helpers -------------------------- */
    async exchangeCodeForTokens(code, codeVerifier) {
        const params = new url_1.URLSearchParams({
            grant_type: "authorization_code",
            code,
            client_id: this.config_.clientId,
            client_secret: this.config_.clientSecret,
            redirect_uri: this.config_.callbackUrl,
        });
        if (codeVerifier)
            params.append("code_verifier", codeVerifier);
        const { data } = await axios_1.default.post(`${this.config_.loginUrl}/services/oauth2/token`, params.toString(), { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
        return data;
    }
    async getUserProfile(accessToken) {
        const { data } = await axios_1.default.get(`${this.config_.loginUrl}/services/oauth2/userinfo`, { headers: { Authorization: `Bearer ${accessToken}` } });
        return data;
    }
    generateAuthorizationUrl(redirectTo = "/") {
        const codeVerifier = crypto_1.default.randomBytes(64).toString("base64url");
        const codeChallenge = crypto_1.default
            .createHash("sha256")
            .update(codeVerifier)
            .digest("base64url");
        const state = Buffer.from(JSON.stringify({ redirectTo, ts: Date.now() })).toString("base64");
        const params = new url_1.URLSearchParams({
            response_type: "code",
            client_id: this.config_.clientId,
            redirect_uri: this.config_.callbackUrl,
            scope: this.config_.scopes.join(" "),
            state,
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
        });
        return {
            url: `${this.config_.loginUrl}/services/oauth2/authorize?${params}`,
            codeVerifier,
            state,
        };
    }
}
SalesforceAuthService.identifier = "salesforce_service";
exports.default = SalesforceAuthService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL3NhbGVzZm9yY2Uvc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLDJDQUE2QztBQUs3QyxxREFHNkI7QUFDN0Isa0RBQXlCO0FBQ3pCLG9EQUEyQjtBQUMzQiw2QkFBcUM7QUFFckMsTUFBcUIscUJBQXFCO0lBTXhDLFlBQVksU0FBYyxFQUFFLE1BQVc7UUFDckMsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUE7UUFDM0IsSUFBSSxDQUFDLE9BQU8sR0FBRztZQUNiLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUTtZQUN6QixZQUFZLEVBQUUsTUFBTSxDQUFDLFlBQVk7WUFDakMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxXQUFXO1lBQy9CLFFBQVEsRUFBRSxNQUFNLENBQUMsT0FBTztnQkFDdEIsQ0FBQyxDQUFDLDZCQUE2QjtnQkFDL0IsQ0FBQyxDQUFDLDhCQUE4QjtZQUNsQyxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sSUFBSSxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUM7U0FDaEYsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsWUFBWSxDQUNoQixJQUFZLEVBQ1osWUFBZ0MsRUFDaEMsZUFBdUMsRUFDdkMsV0FBK0I7UUFFL0IseUNBQXlDO1FBQ3pDLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUVuRSx3Q0FBd0M7UUFDeEMsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUUzRCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN4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