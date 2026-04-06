/**
 * STAFF CONTROLLER - Owner quản lý nhân sự
 */

const bcrypt = require('bcryptjs');
const User = require('../model/User.model');
const { isValidEmail, isValidPhone, normalizeEmail, normalizePhone } = require('../utils/guestVerification');
const {
    ALL_PERMISSIONS,
    expandPermissionAliases,
    normalizePermission
} = require('../access-control/permissions');
const { clearCachedPermissions, resolveUserAccess } = require('../services/accessControl.service');

const MANAGED_ROLES = ['staff', 'owner'];
const ALL_PERMISSION_SET = new Set(ALL_PERMISSIONS.map((permission) => normalizePermission(permission)));

const getPrimaryAdminEmail = () => String(process.env.OWNER_EMAIL || '').trim().toLowerCase();

const isPrimaryAdminRequest = (req) => {
    const primaryAdminEmail = getPrimaryAdminEmail();
    if (!primaryAdminEmail) {
        return false;
    }

    return String(req.user?.role || '').trim().toLowerCase() === 'owner'
        && String(req.user?.email || '').trim().toLowerCase() === primaryAdminEmail;
};

const ensurePrimaryAdmin = (req, res) => {
    if (isPrimaryAdminRequest(req)) {
        return true;
    }

    res.status(403).json({
        success: false,
        message: 'Chỉ tài khoản admin chính mới được chỉnh phân quyền'
    });
    return false;
};

const sanitizeStaff = (user) => ({
    id: user._id,
    role: user.role,
    name: user.name,
    phone: user.phone,
    email: user.email,
    status: user.status,
    avatarUrl: user.avatarUrl,
    address: user.address,
    gender: user.gender,
    dateOfBirth: user.dateOfBirth,
    directPermissions: Array.isArray(user.directPermissions) ? user.directPermissions : [],
    deniedPermissions: Array.isArray(user.deniedPermissions) ? user.deniedPermissions : [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
});

const normalizePermissionList = (permissions = []) => {
    if (!Array.isArray(permissions)) {
        return [];
    }

    const normalized = permissions
        .flatMap((permission) => expandPermissionAliases(permission))
        .map((permission) => normalizePermission(permission))
        .filter((permission) => ALL_PERMISSION_SET.has(permission));

    return [...new Set(normalized)];
};

const listStaff = async (req, res) => {
    try {
        const filter = { role: 'staff' };
        const { status, role } = req.query;

        if (status === 'active' || status === 'locked' || status === 'pending') {
            filter.status = status;
        }

        const normalizedRole = String(role || '').trim().toLowerCase();
        if (MANAGED_ROLES.includes(normalizedRole)) {
            filter.role = normalizedRole;
        } else if (normalizedRole === 'all') {
            filter.role = { $in: MANAGED_ROLES };
        }

        const staff = await User.find(filter).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách nhân sự thành công',
            data: staff.map(sanitizeStaff)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách nhân sự',
            error: error.message
        });
    }
};

const getStaffDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const staff = await User.findOne({ _id: id, role: { $in: MANAGED_ROLES } });

        if (!staff) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân sự'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Lấy chi tiết nhân sự thành công',
            data: sanitizeStaff(staff)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy chi tiết nhân sự',
            error: error.message
        });
    }
};

const createStaff = async (req, res) => {
    try {
        const { name, phone, email, password, status, gender, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Cần nhập đủ tên, email và mật khẩu'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu phải có ít nhất 6 ký tự'
            });
        }

        const normalizedGender = typeof gender === 'string' ? gender.trim().toLowerCase() : null;
        const allowedGenders = ['male', 'female', 'other'];
        const normalizedRole = String(role || 'staff').trim().toLowerCase();

        if (normalizedGender && !allowedGenders.includes(normalizedGender)) {
            return res.status(400).json({
                success: false,
                message: 'Giới tính chỉ nhận male, female hoặc other'
            });
        }

        if (!MANAGED_ROLES.includes(normalizedRole)) {
            return res.status(400).json({
                success: false,
                message: `Vai trò phải là một trong các giá trị: ${MANAGED_ROLES.join(', ')}`
            });
        }

        if (normalizedRole === 'owner' && !ensurePrimaryAdmin(req, res)) {
            return;
        }

        const normalizedEmail = normalizeEmail(email);
        const normalizedPhone = phone ? normalizePhone(phone) : null;

        if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Email không hợp lệ'
            });
        }

        if (normalizedPhone && !isValidPhone(normalizedPhone)) {
            return res.status(400).json({
                success: false,
                message: 'Số điện thoại không hợp lệ'
            });
        }

        const [existingEmail, existingPhone] = await Promise.all([
            User.findOne({ email: normalizedEmail }),
            normalizedPhone ? User.findOne({ phone: normalizedPhone }) : Promise.resolve(null)
        ]);

        if (existingEmail) {
            return res.status(409).json({
                success: false,
                message: 'Email đã được sử dụng'
            });
        }

        if (existingPhone) {
            return res.status(409).json({
                success: false,
                message: 'Số điện thoại đã được sử dụng'
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const normalizedStatus = normalizedRole === 'staff'
            ? 'pending'
            : (status === 'locked' ? 'locked' : 'active');

        const staff = await User.create({
            role: normalizedRole,
            name: String(name).trim(),
            phone: normalizedPhone,
            email: normalizedEmail,
            passwordHash,
            authProvider: 'local',
            status: normalizedStatus,
            gender: normalizedGender || null
        });

        return res.status(201).json({
            success: true,
            message: 'Tạo nhân sự thành công',
            data: sanitizeStaff(staff)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo nhân sự',
            error: error.message
        });
    }
};

const updateStaffStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (status !== 'active' && status !== 'locked' && status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Trạng thái chỉ có thể là active, locked hoặc pending'
            });
        }

        const staff = await User.findOne({ _id: id, role: { $in: MANAGED_ROLES } });

        if (!staff) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân sự'
            });
        }

        if (String(req.user?.id || '') === String(staff._id) && status === 'locked') {
            return res.status(400).json({
                success: false,
                message: 'Không thể tự khóa chính tài khoản đang đăng nhập'
            });
        }

        staff.status = status;
        await staff.save();

        return res.status(200).json({
            success: true,
            message: 'Cập nhật trạng thái nhân sự thành công',
            data: sanitizeStaff(staff)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật trạng thái nhân sự',
            error: error.message
        });
    }
};

const updateStaffRole = async (req, res) => {
    try {
        const { id } = req.params;
        const normalizedRole = String(req.body?.role || '').trim().toLowerCase();

        if (!MANAGED_ROLES.includes(normalizedRole)) {
            return res.status(400).json({
                success: false,
                message: `Vai trò phải là một trong các giá trị: ${MANAGED_ROLES.join(', ')}`
            });
        }

        const staff = await User.findOne({ _id: id, role: { $in: MANAGED_ROLES } });
        if (!staff) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân sự'
            });
        }

        if (String(req.user?.id || '') === String(staff._id)) {
            return res.status(400).json({
                success: false,
                message: 'Không thể tự thay đổi vai trò của chính mình'
            });
        }

        staff.role = normalizedRole;
        await staff.save();
        clearCachedPermissions(staff._id.toString());

        return res.status(200).json({
            success: true,
            message: 'Cập nhật vai trò nhân sự thành công',
            data: sanitizeStaff(staff)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật vai trò nhân sự',
            error: error.message
        });
    }
};

const getStaffPermissions = async (req, res) => {
    try {
        const { id } = req.params;
        const staff = await User.findOne({ _id: id, role: { $in: MANAGED_ROLES } });

        if (!staff) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân sự'
            });
        }

        const access = await resolveUserAccess(staff);

        return res.status(200).json({
            success: true,
            message: 'Lấy quyền nhân sự thành công',
            data: {
                user: sanitizeStaff(staff),
                allPermissions: ALL_PERMISSIONS,
                directPermissions: Array.isArray(staff.directPermissions) ? staff.directPermissions : [],
                deniedPermissions: Array.isArray(staff.deniedPermissions) ? staff.deniedPermissions : [],
                effectivePermissions: access.permissions || []
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy quyền nhân sự',
            error: error.message
        });
    }
};

const updateStaffPermissions = async (req, res) => {
    try {
        if (!ensurePrimaryAdmin(req, res)) {
            return;
        }

        const { id } = req.params;
        const { directPermissions, deniedPermissions } = req.body || {};

        const staff = await User.findOne({ _id: id, role: { $in: MANAGED_ROLES } });
        if (!staff) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân sự'
            });
        }

        const nextDirectPermissions = normalizePermissionList(directPermissions);
        const nextDeniedPermissions = normalizePermissionList(deniedPermissions);
        const deniedSet = new Set(nextDeniedPermissions);
        const filteredDirectPermissions = nextDirectPermissions.filter((permission) => !deniedSet.has(permission));

        staff.directPermissions = filteredDirectPermissions;
        staff.deniedPermissions = nextDeniedPermissions;
        await staff.save();
        clearCachedPermissions(staff._id.toString());

        const access = await resolveUserAccess(staff);

        return res.status(200).json({
            success: true,
            message: 'Cập nhật quyền nhân sự thành công',
            data: {
                user: sanitizeStaff(staff),
                directPermissions: filteredDirectPermissions,
                deniedPermissions: nextDeniedPermissions,
                effectivePermissions: access.permissions || []
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật quyền nhân sự',
            error: error.message
        });
    }
};


module.exports = {
    listStaff,
    getStaffDetail,
    createStaff,
    updateStaffStatus,
    updateStaffRole,
    getStaffPermissions,
    updateStaffPermissions
};

