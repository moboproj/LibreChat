const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { requireUsersWrite } = require('../middleware/usersWrite');
const {
  getUsers,
  getUserById,
  getUserUsage,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser,
} = require('../controllers/users.controller');
const {
  getSsoLinkStatus,
  getSsoRoles,
  getSsoEmployee,
  linkSsoUser,
} = require('../controllers/usersSso.controller');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/', getUsers);

// SSO link (allowed even when usersWriteEnabled=false)
router.get('/sso/status', getSsoLinkStatus);
router.get('/sso/roles', getSsoRoles);
router.get('/sso/employees/:employeeNumber', getSsoEmployee);
router.post('/sso/link', linkSsoUser);

router.get('/:id/usage', getUserUsage);
router.get('/:id', getUserById);

router.post('/', requireUsersWrite, createUser);
router.put('/:id/password', requireUsersWrite, updateUserPassword);
router.put('/:id', requireUsersWrite, updateUser);
router.delete('/:id', requireUsersWrite, deleteUser);

module.exports = router;
