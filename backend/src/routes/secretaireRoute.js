import express from "express";
import {
  checkInPatient,
  cancelAdmission,
  collectPayment,
  registerWalkIn,
  registerEmergency,
  getDoctorConsultationStatus
} from "../controllers/secretaireController.js";
import authUser from "../middlewares/authUser.js";

const secretaireRouter = express.Router();

secretaireRouter.post("/check-in", authUser, checkInPatient);
secretaireRouter.post("/cancel-admission", authUser, cancelAdmission);
secretaireRouter.post("/collect-payment", authUser, collectPayment);
secretaireRouter.post("/register-walkin", authUser, registerWalkIn);
secretaireRouter.post("/register-emergency", authUser, registerEmergency);
secretaireRouter.get("/doctor-status", authUser, getDoctorConsultationStatus);

export default secretaireRouter;
