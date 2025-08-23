const express = require('express');
const router = express.Router();
const { checkSchema } = require('express-validator');
const auth = require('../middleware/auth');
const { validate, addItemSchema, updateItemSchema } = require('../middleware/validation');
const listController = require('../controllers/listController');

router.use(auth);

router.post('/add', checkSchema(addItemSchema), validate, listController.addItem);
router.put('/update/:itemId', checkSchema(updateItemSchema), validate, listController.updateItem);
router.put('/toggle-season/:itemId', listController.toggleSeason);
router.delete('/:itemId', listController.deleteItem);
router.get('/', listController.getLists);
router.get('/filtered', listController.getFilteredLists);
router.get('/stats', listController.getStats);

module.exports = router;
