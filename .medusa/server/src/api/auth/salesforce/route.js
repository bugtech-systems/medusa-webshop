"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
async function GET(req, res) {
    try {
        // Get token from query, header, or cookie
        const token = req.query.token?.toString() ||
            req.headers.authorization?.replace("Bearer ", "") ||
            req.cookies?._medusa_jwt;
        if (!token) {
            return res.status(400).json({ message: "JWT token not provided" });
        }
        const jwtSecret = process.env.MEDUSA_JWT_SECRET || process.env.JWT_SECRET;
        let payload;
        if (jwtSecret) {
            // Verify token if secret available
            try {
                payload = jsonwebtoken_1.default.verify(token, jwtSecret);
            }
            catch (err) {
                return res.status(401).json({ message: "Invalid token", error: err.message });
            }
        }
        else {
            // Decode without verification
            payload = jsonwebtoken_1.default.decode(token);
        }
        return res.status(200).json({
            success: true,
            payload,
        });
    }
    catch (err) {
        return res.status(500).json({ message: "Failed to decode token", error: err.message });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2F1dGgvc2FsZXNmb3JjZS9yb3V0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUlBLGtCQW1DQztBQXJDRCxnRUFBOEI7QUFFdkIsS0FBSyxVQUFVLEdBQUcsQ0FBQyxHQUFrQixFQUFFLEdBQW1CO0lBQy9ELElBQUksQ0FBQztRQUNILDBDQUEwQztRQUMxQyxNQUFNLEtBQUssR0FDVCxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUU7WUFDM0IsR0FBRyxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUM7WUFDakQsR0FBRyxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUE7UUFFMUIsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1gsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxDQUFDLENBQUE7UUFDcEUsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUE7UUFFekUsSUFBSSxPQUFZLENBQUE7UUFFaEIsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNkLG1DQUFtQztZQUNuQyxJQUFJLENBQUM7Z0JBQ0gsT0FBTyxHQUFHLHNCQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUN4QyxDQUFDO1lBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztnQkFDbEIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1lBQy9FLENBQUM7UUFDSCxDQUFDO2FBQU0sQ0FBQztZQUNOLDhCQUE4QjtZQUM5QixPQUFPLEdBQUcsc0JBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0IsQ0FBQztRQUVELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsT0FBTyxFQUFFLElBQUk7WUFDYixPQUFPO1NBQ1IsQ0FBQyxDQUFBO0lBQ0osQ0FBQztJQUFDLE9BQU8sR0FBUSxFQUFFLENBQUM7UUFDbEIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7SUFDeEYsQ0FBQztBQUNILENBQUMifQ==