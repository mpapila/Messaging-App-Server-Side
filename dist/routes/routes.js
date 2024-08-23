"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const UserController_1 = require("../controller/UserController");
const middleware_1 = require("../middleware");
const router = express_1.default.Router();
router.post('/login', UserController_1.userLogin);
router.post('/register', UserController_1.userRegister);
router.get('/addUserList', middleware_1.verifyToken, UserController_1.addUserList);
router.get('/acceptPendingList', middleware_1.verifyToken, UserController_1.acceptPendingList);
router.post('/addFriend', middleware_1.verifyToken, UserController_1.addFriend);
router.post('/acceptFriend', middleware_1.verifyToken, UserController_1.acceptFriend);
router.get('/exportCardInfo', middleware_1.verifyToken, UserController_1.exportCardInfo);
router.get('/health-check', UserController_1.healtCheck);
exports.default = router;
UserController_1.addUserList;
