"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const sequelize_2 = require("sequelize");
const { models } = sequelize_1.default;
class PermissionService {
    constructor() { }
    async findAll(code) {
        const rta = await models.PERMISSION.findAll({
            where: {
                code: {
                    [sequelize_2.Op.like]: code ? `${code}%` : "%",
                },
            },
        });
        return rta.map((permission) => ({
            id: permission.dataValues.id,
            name: permission.dataValues.name,
            code: permission.dataValues.code,
            icon: permission.dataValues.icon,
            link: permission.dataValues.link,
            idPermissionMain: permission.dataValues.idPermissionMain,
            isDropdown: permission.dataValues.isDropdown,
        }));
    }
    async findAllByRoleId(roleId) {
        const rtaRolePermission = await models.ROLE_PERMISSION.findAll({
            where: {
                roleId,
            },
        });
        const permissionIds = rtaRolePermission.map((rolePermission) => {
            return rolePermission.dataValues.permissionId;
        });
        const rta = await models.PERMISSION.findAll({
            where: {
                id: { [sequelize_2.Op.in]: permissionIds },
            },
        });
        return rta.map((permission) => ({
            id: permission.dataValues.id,
            name: permission.dataValues.name,
            code: permission.dataValues.code,
            icon: permission.dataValues.icon,
            link: permission.dataValues.link,
            idPermissionMain: permission.dataValues.idPermissionMain,
            isDropdown: permission.dataValues.isDropdown,
        }));
    }
    async findOne(id) {
        const permission = await models.PERMISSION.findByPk(id);
        if (!permission) {
            throw boom_1.default.notFound("Permiso no encontrado");
        }
        return permission;
    }
    async create(data) {
        const newPermission = await models.PERMISSION.create(data);
        return newPermission;
    }
    async update(id, changes) {
        const permission = await this.findOne(id);
        const rta = await permission.update(changes);
        return rta;
    }
    async delete(id) {
        const permission = await this.findOne(id);
        await permission.destroy();
        return { id };
    }
}
exports.default = PermissionService;
