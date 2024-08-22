"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const { models } = sequelize_1.default;
class GoalUserService {
    constructor() { }
    async updateGoalUser(idGoalUser, quantity) {
        const goalUser = await models.GOAL_USER.findByPk(idGoalUser);
        if (goalUser)
            await goalUser.update({
                quantity,
            });
    }
}
exports.default = GoalUserService;
