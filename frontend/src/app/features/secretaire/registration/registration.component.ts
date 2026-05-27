import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { NgIconComponent } from '@ng-icons/core';

interface RegistrationFormData {
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  nationalId: string;
  address: string;
  city: string;
  postalCode: string;
  emergencyName: string;
  emergencyPhone: string;
  
  // Step 2: Medical History
  bloodType: string;
  allergies: string;
  chronicConditions: string;
  medications: string;
  previousSurgeries: string;
  familyHistory: string;

  // Step 3: Insurance
  insuranceProvider: string;
  policyNumber: string;
  coverageType: string;
}

@Component({
  selector: 'ms-secretary-registration',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  templateUrl: './registration.component.html',
  styleUrl: './registration.component.scss'
})
export class RegistrationComponent implements OnInit {
  currentStep = 1;
  isSubmitted = false;

  formData: RegistrationFormData = {
    firstName: '',
    lastName: '',
    dob: '',
    gender: 'Female',
    phone: '',
    email: '',
    nationalId: '',
    address: '',
    city: '',
    postalCode: '',
    emergencyName: '',
    emergencyPhone: '',
    bloodType: 'O+',
    allergies: 'None',
    chronicConditions: 'None',
    medications: '',
    previousSurgeries: '',
    familyHistory: '',
    insuranceProvider: 'CNOPS',
    policyNumber: '',
    coverageType: 'Premium Comprehensive'
  };

  steps = [
    { num: 1, label: "Personal Info" },
    { num: 2, label: "Medical History" },
    { num: 3, label: "Insurance" },
    { num: 4, label: "Confirmation" }
  ];

  dobDay = '';
  dobMonth = '';
  dobYear = '';

  days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
  months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];
  years = Array.from({ length: 87 }, (_, i) => String(2026 - i));

  ngOnInit() {
    this.parseDob();
  }

  updateDob() {
    if (this.dobDay && this.dobMonth && this.dobYear) {
      this.formData.dob = `${this.dobYear}-${this.dobMonth}-${this.dobDay}`;
    } else {
      this.formData.dob = '';
    }
  }

  private parseDob() {
    if (this.formData.dob) {
      const parts = this.formData.dob.split('-');
      if (parts.length === 3) {
        this.dobYear = parts[0];
        this.dobMonth = parts[1];
        this.dobDay = parts[2];
      }
    }
  }

  handleNextStep() {
    if (this.currentStep === 1) {
      if (!this.formData.firstName || !this.formData.lastName || !this.formData.phone) {
        alert("Please fill out the primary mandatory fields (First Name, Last Name, Phone) on Step 1.");
        return;
      }
    }
    if (this.currentStep === 3) {
      if (!this.formData.policyNumber) {
        alert("Please input your insurance card Policy Number on Step 3.");
        return;
      }
    }
    this.currentStep = Math.min(this.currentStep + 1, 4);
  }

  handlePrevStep() {
    this.currentStep = Math.max(this.currentStep - 1, 1);
  }

  setGender(gender: string) {
    this.formData.gender = gender;
  }

  constructor(private http: HttpClient) {}

  handleSubmit() {
    const {
      firstName, lastName, dob, gender, phone, email,
      nationalId, address, city, postalCode,
      emergencyName, emergencyPhone,
      bloodType, allergies, chronicConditions,
      medications, previousSurgeries, familyHistory,
      insuranceProvider, policyNumber, coverageType
    } = this.formData;
    this.http.post(`${environment.apiUrl}/auth/register`, {
      name: `${firstName} ${lastName}`,
      email: email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@medi.ma`,
      password: 'tempPass123',
      phone,
      address,
      city,
      postalCode,
      dateOfBirth: dob || undefined,
      gender,
      nationalId,
      bloodType,
      allergies: allergies === 'None' ? '' : allergies,
      chronicConditions: chronicConditions === 'None' ? '' : chronicConditions,
      emergencyContactName: emergencyName,
      emergencyContactPhone: emergencyPhone,
      insuranceProvider,
      policyNumber,
      medications,
      previousSurgeries,
      familyHistory,
      coverageType
    }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.isSubmitted = true;
          alert(`Patient ${this.formData.firstName} ${this.formData.lastName} registered successfully!`);
        } else {
          alert(res.message || 'Registration failed');
        }
      },
      error: (err) => alert(err.error?.message || 'Server error during registration')
    });
  }

  resetForm() {
    this.formData = {
      firstName: '',
      lastName: '',
      dob: '',
      gender: 'Female',
      phone: '',
      email: '',
      nationalId: '',
      address: '',
      city: '',
      postalCode: '',
      emergencyName: '',
      emergencyPhone: '',
      bloodType: 'O+',
      allergies: 'None',
      chronicConditions: 'None',
      medications: '',
      previousSurgeries: '',
      familyHistory: '',
      insuranceProvider: 'CNOPS',
      policyNumber: '',
      coverageType: 'Premium Comprehensive'
    };
    this.dobDay = '';
    this.dobMonth = '';
    this.dobYear = '';
    this.isSubmitted = false;
    this.currentStep = 1;
  }
}
