const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getFiles, getFileById } = require('../controllers/files.controller');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/', getFiles);
router.get('/:id', getFileById);

module.exports = router;
