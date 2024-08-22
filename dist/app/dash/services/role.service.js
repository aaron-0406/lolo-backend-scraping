"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = __importDefault(require("../../../libs/sequelize"));
const boom_1 = __importDefault(require("@hapi/boom"));
const { models } = sequelize_1.default;
class RoleService {
    constructor() { }
    async findAllByCustomerId(customerId) {
        const rta = await models.ROLE.findAll({
            where: {
                customerId,
            },
        });
        return rta;
    }
    async findOne(id) {
        const role = await models.ROLE.findByPk(id);
        if (!role) {
            throw boom_1.default.notFound("Rol no encontrado");
        }
        return role;
    }
    async create(data, permissions) {
        const newRole = await models.ROLE.create(data);
        for (let i = 0; i < permissions.length; i++) {
            const element = permissions[i];
            await models.ROLE_PERMISSION.create({
                roleId: newRole.dataValues.id,
                permissionId: element,
            });
        }
        return newRole;
    }
    async update(id, changes, permissions) {
        const role = await this.findOne(id);
        const oldRole = Object.assign({}, role.get());
        const oldRolePermissions = await models.ROLE_PERMISSION.findAll({
            where: {
                roleId: role.dataValues.id,
            },
        });
        const formatOldRolePermissions = oldRolePermissions.map((item) => item.dataValues);
        const permissionsToDelete = formatOldRolePermissions.filter((item) => !permissions.includes(item.permissionId));
        const permissionWithoutChanges = formatOldRolePermissions.filter((item) => permissions.includes(item.permissionId));
        const permissionWithoutChangesIds = permissionWithoutChanges.map((item) => item.permissionId);
        await models.ROLE_PERMISSION.destroy({
            where: {
                roleId: role.dataValues.id,
            },
        });
        const newRole = await role.update(changes);
        for (let i = 0; i < permissions.length; i++) {
            const element = permissions[i];
            await models.ROLE_PERMISSION.create({
                roleId: role.dataValues.id,
                permissionId: element,
            });
        }
        const newRolePermissions = await models.ROLE_PERMISSION.findAll({
            where: {
                roleId: role.dataValues.id,
            },
        });
        const formatNewRolePermissions = newRolePermissions.map((item) => item.dataValues);
        const permissionsToAdd = formatNewRolePermissions.filter((item) => !permissionWithoutChangesIds.includes(item.permissionId));
        return { oldRole, newRole, permissionsToDelete, permissionWithoutChanges, permissionsToAdd };
    }
    async delete(id) {
        const role = await this.findOne(id);
        const oldRole = Object.assign({}, role.get());
        await models.ROLE_PERMISSION.destroy({
            where: { roleId: id },
        });
        await role.destroy();
        return oldRole;
    }
}
exports.default = RoleService;
