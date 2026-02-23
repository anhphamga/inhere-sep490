/**
 * STAFF CONTROLLER - Owner quản lý nhân sự
 */

const bcrypt = require('bcryptjs');
const User = require('../model/User.model');

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
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
});

const listStaff = async (req, res) => {
    try {
        const filter = { role: 'staff' };
        const { status } = req.query;

        if (status === 'active' || status === 'locked') {
            filter.status = status;
        }

        const staff = await User.find(filter).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: 'Get staff list successfully',
            data: staff.map(sanitizeStaff)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error getting staff list',
            error: error.message
        });
    }
};

const getStaffDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const staff = await User.findOne({ _id: id, role: 'staff' });

        if (!staff) {
            return res.status(404).json({
                success: false,
                message: 'Staff not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Get staff detail successfully',
            data: sanitizeStaff(staff)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error getting staff detail',
            error: error.message
        });
    }
};

const createStaff = async (req, res) => {
    try {
        const { name, phone, email, password, status, gender } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'name, email, password are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'password must be at least 6 characters'
            });
        }

        const normalizedGender = typeof gender === 'string' ? gender.trim().toLowerCase() : null;
        const allowedGenders = ['male', 'female', 'other'];

        if (normalizedGender && !allowedGenders.includes(normalizedGender)) {
            return res.status(400).json({
                success: false,
                message: 'gender must be male, female, or other'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingEmail = await User.findOne({
            email: normalizedEmail,
            authProvider: 'local'
        });

        if (existingEmail) {
            return res.status(409).json({
                success: false,
                message: 'Email already exists'
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const staff = await User.create({
            role: 'staff',
            name,
            phone: phone ? phone.trim() : null,
            email: normalizedEmail,
            passwordHash,
            authProvider: 'local',
            status: status === 'locked' ? 'locked' : 'active',
            gender: normalizedGender || null
        });

        return res.status(201).json({
            success: true,
            message: 'Create staff successfully',
            data: sanitizeStaff(staff)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error creating staff',
            error: error.message
        });
    }
};

const updateStaffStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (status !== 'active' && status !== 'locked') {
            return res.status(400).json({
                success: false,
                message: 'status must be active or locked'
            });
        }

        const staff = await User.findOne({ _id: id, role: 'staff' });

        if (!staff) {
            return res.status(404).json({
                success: false,
                message: 'Staff not found'
            });
        }

        staff.status = status;
        await staff.save();

        return res.status(200).json({
            success: true,
            message: 'Update staff status successfully',
            data: sanitizeStaff(staff)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error updating staff status',
            error: error.message
        });
    }
};


module.exports = {
    listStaff,
    getStaffDetail,
    createStaff,
    updateStaffStatus
};
