import prisma from "../config/prisma.js";

const DEPT_COLORS = ['#4F46E5', '#0891B2', '#059669', '#D97706', '#DC2626', '#7C3AED'];

export const getAdminStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth()-1, 1);
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate()+1);

    const [
      totalDoctors, totalPatients, totalAppointments,
      apptThisMonth, apptLastMonth,
      revenue, revenueLastMonth,
      recentAppointments, cancelledCount,
      completedCount, pendingCount, overdueInvoices
    ] = await Promise.all([
      prisma.doctor.count({ where: { isActive: true } }),
      prisma.patient.count(),
      prisma.appointment.count(),
      prisma.appointment.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.appointment.count({ where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } } }),
      prisma.invoice.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
      prisma.invoice.aggregate({ where: { status: 'PAID', createdAt: { gte: startOfLastMonth, lt: startOfMonth } }, _sum: { amount: true } }),
      prisma.appointment.findMany({
        take: 10, orderBy: { createdAt: 'desc' },
        include: {
          patient: { include: { user: { select: { name: true } } } },
          doctor: { include: { user: { select: { name: true } } } }
        }
      }),
      prisma.appointment.count({ where: { status: 'CANCELLED' } }),
      prisma.appointment.count({ where: { status: 'COMPLETED' } }),
      prisma.appointment.count({ where: { status: 'PENDING' } }),
      prisma.invoice.count({ where: { status: 'OVERDUE' } }),
    ]);

    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const [total, cancelled, completed] = await Promise.all([
        prisma.appointment.count({ where: { date: { gte: monthStart, lte: monthEnd } } }),
        prisma.appointment.count({ where: { date: { gte: monthStart, lte: monthEnd }, status: 'CANCELLED' } }),
        prisma.appointment.count({ where: { date: { gte: monthStart, lte: monthEnd }, status: 'COMPLETED' } }),
      ]);
      monthlyData.push({
        month: monthStart.toLocaleString('en', { month: 'short' }),
        total, cancelled, completed
      });
    }

    const deptStats = await prisma.doctor.groupBy({
      by: ['specialty'], _count: { id: true }
    });

    const topPatients = await prisma.appointment.groupBy({
      by: ['patientId'], _count: { id: true },
      orderBy: { _count: { id: 'desc' } }, take: 5
    });

    const topPatientsWithNames = await Promise.all(
      topPatients.map(async (tp) => {
        const patient = await prisma.patient.findUnique({
          where: { id: tp.patientId },
          include: { user: { select: { name: true } } }
        });
        return {
          name: patient?.user?.name || 'Unknown',
          patientCode: patient?.patientCode,
          appointmentCount: tp._count.id,
          totalPaid: tp._count.id * 400
        };
      })
    );

    // -- Planner appointments (today's upcoming) --
    const plannerAppts = await prisma.appointment.findMany({
      where: { date: { gte: todayStart, lt: todayEnd }, status: { in: ['PENDING','CONFIRMED'] } },
      orderBy: { date: 'asc' }, take: 4,
      include: {
        doctor: { include: { user: { select: { name: true } } } }
      }
    });

    const colors = ['#4F46E5','#06B6D4','#10B981','#F59E0B'];
    const plannerAppointments = plannerAppts.map((a, i) => ({
      time: new Date(a.date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: true }),
      doctorName: 'Dr. ' + a.doctor.user.name,
      specialty: a.doctor.specialty || 'General',
      type: a.type || 'Visit',
      dotColor: colors[i % colors.length]
    }));

    // -- Active departments --
    const activeDepartments = deptStats.map((d, i) => ({
      name: d.specialty,
      value: d._count.id,
      color: DEPT_COLORS[i % DEPT_COLORS.length]
    }));

    // -- On-duty doctors --
    const onDutyDoctorsRaw = await prisma.doctor.findMany({
      where: { isActive: true }, take: 3,
      include: { user: { select: { name: true } } }
    });
    const onDutyDoctors = onDutyDoctorsRaw.map((d, i) => ({
      name: 'Dr. ' + d.user.name,
      room: `Room ${101 + i}`,
      status: i === 0 ? 'Available' : i === 1 ? 'In Consultation' : 'On Break',
      color: DEPT_COLORS[i % DEPT_COLORS.length],
      initials: d.user.name.split(' ').map(n => n[0]).join('')
    }));

    // -- Recent transactions --
    const recentInvoices = await prisma.invoice.findMany({
      where: { status: { in: ['PAID','PENDING'] } },
      orderBy: { createdAt: 'desc' }, take: 4,
      include: { patient: { include: { user: { select: { name: true } } } } }
    });
    const recentTransactions = recentInvoices.map(inv => ({
      name: 'Consultation ' + (inv.status === 'PAID' ? 'Payment' : 'Invoice'),
      patient: inv.patient?.user?.name || 'Unknown',
      invoice: inv.invoiceNumber || `INV-${inv.id.slice(-6).toUpperCase()}`,
      amount: (inv.status === 'PAID' ? '+' : '') + (inv.amount || 0).toFixed(0) + ' MAD',
      type: inv.status === 'PAID' ? 'income' : 'pending',
      icon: inv.status === 'PAID' ? 'heroBanknotes' : 'heroReceiptPercent',
      isPositive: inv.status === 'PAID'
    }));

    // -- Summary boxes --
    const currentMonth = monthlyData[monthlyData.length - 1] || { total: 0, cancelled: 0, completed: 0 };
    const postponedCount = currentMonth.total - currentMonth.completed - currentMonth.cancelled;

    const currentRevenue = revenue._sum.amount || 0;
    const lastRevenue = revenueLastMonth._sum.amount || 0;
    const revenueTrend = lastRevenue > 0
      ? Math.round(((currentRevenue - lastRevenue) / lastRevenue) * 100) : 0;
    const apptTrend = apptLastMonth > 0
      ? Math.round(((apptThisMonth - apptLastMonth) / apptLastMonth) * 100) : 0;

    res.json({
      success: true,
      data: {
        stats: {
          totalDoctors, totalPatients, totalAppointments,
          totalRevenue: currentRevenue,
          apptTrend, revenueTrend,
          cancelledCount, completedCount,
          pendingCount, overdueInvoices
        },
        chartData: { monthly: monthlyData, departments: deptStats },
        recentAppointments: recentAppointments.map(a => ({
          id: a.id,
          patientName: a.patient.user.name,
          patientCode: `PT-${a.patient.id.slice(-4).toUpperCase()}`,
          patientInitials: a.patient.user.name.split(' ').map(n=>n[0]).join(''),
          doctorName: a.doctor.user.name,
          date: a.date,
          status: a.status,
          type: a.type,
          mode: a.mode,
          fee: a.fee
        })),
        topPatients: topPatientsWithNames,
        summaryBoxes: {
          consultations: currentMonth.total,
          cancellations: currentMonth.cancelled,
          postponed: postponedCount
        },
        plannerAppointments,
        activeDepartments,
        onDutyDoctors,
        recentTransactions
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Stats fetch failed' });
  }
};

export const getDoctorStats = async (req, res) => {
  try {
    const doctorId = req.doctor?.id;
    if (!doctorId) return res.status(401).json({ error: 'Unauthorized' });

    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate()-7);
    const twoWeeksAgo = new Date(today); twoWeeksAgo.setDate(twoWeeksAgo.getDate()-14);

    const [
      todayAppts,       myPatientsRaw, pendingCount, pendingReviewAppointments,
      thisWeekCount, lastWeekCount, nextAppointment,
      recentVisits, completedCount, cancelledCount,
      prescriptionsCount, monthlyData
    ] = await Promise.all([
      prisma.appointment.findMany({
        where: { doctorId, date: { gte: today, lt: tomorrow } },
        orderBy: { date: 'asc' },
        include: { patient: { include: { user: { select: { name: true } } } } }
      }),
      prisma.appointment.groupBy({ by: ['patientId'], where: { doctorId } }),
      prisma.appointment.count({ where: { doctorId, status: 'PENDING' } }),
      prisma.appointment.findMany({
        where: { doctorId, status: 'PENDING' },
        orderBy: { date: 'desc' },
        take: 10,
        include: { patient: { include: { user: { select: { name: true } } } } }
      }),
      prisma.appointment.count({ where: { doctorId, createdAt: { gte: weekAgo } } }),
      prisma.appointment.count({ where: { doctorId, createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
      prisma.appointment.findFirst({
        where: { doctorId, date: { gte: new Date() }, status: { in: ['PENDING','CONFIRMED','IN_CONSULTATION'] } },
        orderBy: { date: 'asc' },
        include: { patient: { include: { user: { select: { name: true } } } } }
      }),
      prisma.appointment.findMany({
        where: { doctorId }, take: 5, orderBy: { date: 'desc' },
        include: { patient: { include: { user: { select: { name: true } } } } }
      }),
      prisma.appointment.count({ where: { doctorId, status: 'COMPLETED' } }),
      prisma.appointment.count({ where: { doctorId, status: 'CANCELLED' } }),
      prisma.prescription.count({ where: { doctorId } }),
      (async () => {
        const now = new Date();
        const data = [];
        for (let i = 11; i >= 0; i--) {
          const ms = new Date(now.getFullYear(), now.getMonth()-i, 1);
          const me = new Date(now.getFullYear(), now.getMonth()-i+1, 0);
          const [total, completed, cancelled] = await Promise.all([
            prisma.appointment.count({ where: { doctorId, date: { gte: ms, lte: me } } }),
            prisma.appointment.count({ where: { doctorId, date: { gte: ms, lte: me }, status: 'COMPLETED' } }),
            prisma.appointment.count({ where: { doctorId, date: { gte: ms, lte: me }, status: 'CANCELLED' } }),
          ]);
          data.push({ month: ms.toLocaleString('en',{month:'short'}), total, completed, cancelled });
        }
        return data;
      })()
    ]);

    const todayCount = todayAppts.length;
    const weekTrend = lastWeekCount > 0
      ? Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100) : 0;

    // -- Performance summary --
    const total = completedCount + cancelledCount;
    const completedPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    const cancelledPct = total > 0 ? Math.round((cancelledCount / total) * 100) : 0;
    const rescheduledPct = Math.max(0, 100 - completedPct - cancelledPct);
    const perfSummary = {
      totalValidated: `${completedCount} validated appointments`,
      bars: [
        { name: 'Completed', pct: completedPct, color: '#4F46E5' },
        { name: 'Cancelled', pct: cancelledPct, color: '#DC2626' },
        { name: 'Rescheduled', pct: rescheduledPct, color: '#F59E0B' }
      ]
    };

    // -- Weekly schedule --
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekAppts = await prisma.appointment.findMany({
      where: { doctorId, date: { gte: weekStart, lt: weekEnd } },
      orderBy: { date: 'asc' },
      include: { patient: { include: { user: { select: { name: true } } } } }
    });

    const weeklySchedule = [];
    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(dayDate.getDate() + d);
      const dayAppts = weekAppts.filter(a => {
        const ad = new Date(a.date);
        return ad.getDate() === dayDate.getDate() &&
               ad.getMonth() === dayDate.getMonth() &&
               ad.getFullYear() === dayDate.getFullYear();
      });
      const slots = dayAppts.slice(0, 3).map(a => ({
        text: new Date(a.date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: true }),
        color: a.status === 'CANCELLED' ? '#6B7280' : a.status === 'COMPLETED' ? '#14B8A6' : '#F59E0B'
      }));
      weeklySchedule.push({
        day: dayNames[dayDate.getDay()],
        date: dayDate.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        count: `${dayAppts.length} RDVs`,
        slots,
        current: dayDate.getDate() === today.getDate() &&
                 dayDate.getMonth() === today.getMonth() &&
                 dayDate.getFullYear() === today.getFullYear()
      });
    }

    res.json({
      success: true,
      data: {
        stats: {
          todayAppointments: todayCount,
          myPatients: myPatientsRaw.length,
          pendingReviews: pendingCount,
          completedTotal: completedCount,
          cancelledTotal: cancelledCount,
          prescriptionsIssued: prescriptionsCount,
          weekTrend
        },
        nextAppointment: nextAppointment ? {
          id: nextAppointment.id,
          patientName: nextAppointment.patient.user.name,
          patientId: `#AP${nextAppointment.patient.id.slice(-6).toUpperCase()}`,
          patientInitials: nextAppointment.patient.user.name.split(' ').map(n=>n[0]).join(''),
          specialty: 'General Cardiology',
          date: nextAppointment.date,
          type: nextAppointment.type,
          mode: nextAppointment.mode,
          notes: nextAppointment.notes,
          vitals: {
            bp: '120/80',
            hr: nextAppointment.patient.heartRate ? `${nextAppointment.patient.heartRate} bpm` : '75 bpm',
            weight: nextAppointment.patient.weight ? `${nextAppointment.patient.weight} kg` : '70 kg',
            temp: nextAppointment.patient.temperature ? `${nextAppointment.patient.temperature} °C` : '36.8 °C',
            spo2: nextAppointment.patient.spo2 ? `${nextAppointment.patient.spo2} %` : '98 %'
          }
        } : null,
        recentVisits: recentVisits.map(a => ({
          id: a.id,
          patientName: a.patient.user.name,
          patientInitials: a.patient.user.name.split(' ').map(n=>n[0]).join(''),
          date: a.date,
          type: a.type,
          mode: a.mode,
          status: a.status
        })),
        todayAppointmentsList: todayAppts.map(a => ({
          id: a.id,
          patientName: a.patient.user.name,
          patientInitials: a.patient.user.name.split(' ').map(n=>n[0]).join(''),
          time: new Date(a.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }), // 24-hour style e.g., "15:30"
          status: a.status,
          type: a.type,
          mode: a.mode
        })),
        pendingReviewAppointments: pendingReviewAppointments.map(a => ({
          id: a.id,
          patientName: a.patient.user.name,
          patientInitials: a.patient.user.name.split(' ').map(n=>n[0]).join(''),
          date: a.date,
          type: a.type || 'Lab Review'
        })),
        chartData: { monthly: monthlyData },
        perfSummary,
        weeklySchedule
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Doctor stats failed' });
  }
};

export const getPatientStats = async (req, res) => {
  try {
    const userId = req.user?.id;
    const patient = await prisma.patient.findUnique({
      where: { userId },
      include: { user: { select: { name: true } } }
    });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const [
      completedAppts, teleconsults, prescriptionsCount,
      nextAppt, recentAppts, documents
    ] = await Promise.all([
      prisma.appointment.count({ where: { patientId: patient.id, status: 'COMPLETED' } }),
      prisma.appointment.count({ where: { patientId: patient.id, mode: 'Online' } }),
      prisma.prescription.count({ where: { patientId: patient.id, isActive: true } }),
      prisma.appointment.findFirst({
        where: { patientId: patient.id, date: { gte: new Date() }, status: { in: ['PENDING','CONFIRMED'] } },
        orderBy: { date: 'asc' },
        include: { doctor: { include: { user: { select: { name: true } } } } }
      }),
      prisma.appointment.findMany({
        where: { patientId: patient.id }, take: 5, orderBy: { date: 'desc' },
        include: { doctor: { include: { user: { select: { name: true } } } } }
      }),
      prisma.medicalDocument.findMany({ where: { patientId: patient.id }, take: 5, orderBy: { createdAt: 'desc' } })
    ]);

    // -- My Doctors --
    const doctorIds = [...new Set(recentAppts.map(a => a.doctorId))];
    const myDoctorsRaw = await prisma.doctor.findMany({
      where: { id: { in: doctorIds } },
      include: { user: { select: { name: true } } }
    });
    const doctorColors = ['#4F46E5','#0891B2','#059669','#D97706','#DC2626','#7C3AED'];
    const myDoctors = myDoctorsRaw.slice(0, 3).map((d, i) => {
      const apptCount = recentAppts.filter(a => a.doctorId === d.id).length;
      const hasUpcoming = nextAppt && nextAppt.doctorId === d.id;
      return {
        name: 'Dr. ' + d.user.name,
        specialty: d.specialty || 'General',
        consultations: apptCount,
        initials: d.user.name.split(' ').map(n => n[0]).join(''),
        color: doctorColors[i % doctorColors.length],
        apptBadge: hasUpcoming ? `Next Appt: ${new Date(nextAppt.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}` : undefined
      };
    });

    // -- Recent Activities --
    const recentActivities = [];
    for (const a of recentAppts.slice(0, 2)) {
      recentActivities.push({
        action: 'Appointment ' + (a.status === 'COMPLETED' ? 'Completed' : a.status === 'CANCELLED' ? 'Cancelled' : 'Booked'),
        desc: `Consultation with Dr. ${a.doctor.user.name}`,
        date: new Date(a.date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }),
        color: a.status === 'COMPLETED' ? '#059669' : a.status === 'CANCELLED' ? '#DC2626' : '#4F46E5'
      });
    }
    const patientDocs = documents.slice(0, 2);
    for (const d of patientDocs) {
      recentActivities.push({
        action: 'Document Uploaded',
        desc: d.filename || 'Medical document',
        date: new Date(d.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }),
        color: '#0891B2'
      });
    }

    res.json({
      success: true,
      data: {
        stats: {
          completedAppointments: completedAppts,
          teleconsultations: teleconsults,
          activePrescriptions: prescriptionsCount
        },
        vitals: {
          weight: patient.weight, height: patient.height,
          pulse: patient.pulse, spo2: patient.spo2,
          temperature: patient.temperature, heartRate: patient.heartRate,
          bmi: patient.weight && patient.height
            ? (patient.weight / ((patient.height/100)**2)).toFixed(1) : null
        },
        nextAppointment: nextAppt ? {
          id: nextAppt.id,
          doctorName: nextAppt.doctor.user.name,
          specialty: nextAppt.doctor.specialty,
          date: nextAppt.date,
          mode: nextAppt.mode,
          type: nextAppt.type,
          fee: nextAppt.fee,
          notes: nextAppt.notes,
          status: nextAppt.status
        } : null,
        recentAppointments: recentAppts.map(a => ({
          doctorName: a.doctor.user.name,
          specialty: a.doctor.specialty,
          date: a.date, status: a.status, fee: a.fee
        })),
        documents: documents.map(d => ({
          id: d.id, filename: d.filename,
          fileType: d.fileType, fileSize: d.fileSize,
          createdAt: d.createdAt
        })),
        myDoctors,
        recentActivities
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Patient stats failed' });
  }
};

export const getSecretaryStats = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);

    const todayCompleted = await prisma.appointment.count({
      where: { date: { gte: today, lt: tomorrow }, status: 'COMPLETED' }
    });

    const [
      todayAppointments, waitingRoom, invoicesToClose,
      patientsBeingAdmitted, invoicesDueToday, roomStatus,
      activeDoctorsCount, todayRevenue
    ] = await Promise.all([
      prisma.appointment.count({ where: { date: { gte: today, lt: tomorrow }, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      prisma.appointment.count({ where: { date: { gte: today, lt: tomorrow }, status: { in: ['PENDING','CONFIRMED'] } } }),
      prisma.invoice.count({ where: { status: 'PENDING' } }),
      prisma.appointment.findMany({
        where: { date: { gte: today, lt: tomorrow }, status: { not: 'CANCELLED' } },
        orderBy: { date: 'asc' }, take: 10,
        include: {
          patient: { include: { user: { select: { name: true } } } },
          doctor: { include: { user: { select: { name: true } } } }
        }
      }),
      prisma.invoice.findMany({
        where: { status: { in: ['PENDING','OVERDUE'] } },
        orderBy: { dueDate: 'asc' }, take: 10,
        include: { patient: { include: { user: { select: { name: true } } } } }
      }),
      prisma.doctor.findMany({
        where: { isActive: true }, take: 6,
        include: { user: { select: { name: true } } }
      }),
      prisma.doctor.count({ where: { isActive: true } }),
      prisma.invoice.aggregate({
        where: { status: 'PAID', paidAt: { gte: today, lt: tomorrow } },
        _sum: { amount: true }
      })
    ]);

    const inConsultationDoctors = await prisma.appointment.groupBy({
      by: ['doctorId'],
      where: { status: 'IN_CONSULTATION', date: { gte: today, lt: tomorrow } },
      _count: true
    });
    const availableRooms = Math.max(0, activeDoctorsCount - inConsultationDoctors.length);

    const totalInvoiceAmount = await prisma.invoice.aggregate({
      where: { status: { in: ['PENDING','OVERDUE'] } },
      _sum: { amount: true }
    });

    res.json({
      success: true,
      data: {
        stats: {
          todayAppointments,
          todayTotal: todayAppointments,
          waitingRoom: Math.min(waitingRoom, 20),
          invoicesToClose,
          pendingAmount: totalInvoiceAmount._sum.amount || 0,
          todayCompleted,
          todayRevenue: todayRevenue._sum.amount || 0,
          completionRate: todayAppointments > 0
            ? Math.round((todayCompleted / todayAppointments) * 100) : 0,
          waitingRoomMax: 20,
          invoicesMax: 15,
          availableRooms,
          totalRooms: activeDoctorsCount
        },
        patientsBeingAdmitted: patientsBeingAdmitted.map((a,i) => ({
          id: a.id, no: i+1,
          patientName: a.patient.user.name,
          patientInitials: a.patient.user.name.split(' ').map(n=>n[0]).join(''),
          patientAge: 'N/A',
          doctorName: a.doctor.user.name,
          doctorId: a.doctorId,
          time: new Date(a.date).toTimeString().slice(0,5),
          status: a.status
        })),
        invoicesDue: invoicesDueToday.map(inv => ({
          id: inv.id,
          patientName: inv.patient.user.name,
          patientInitials: inv.patient.user.name.split(' ').map(n=>n[0]).join(''),
          amount: inv.amount,
          status: inv.status,
          dueDate: inv.dueDate
        })),
        roomStatus: await Promise.all(roomStatus.map(async (d, i) => {
          const latestAppt = await prisma.appointment.findFirst({
            where: { doctorId: d.id, date: { gte: today, lt: tomorrow }, status: { in: ['CONFIRMED','IN_CONSULTATION','COMPLETED'] } },
            orderBy: { date: 'desc' },
            include: { patient: { include: { user: { select: { name: true } } } } }
          });
          let status = 'Available';
          let patientName = null;
          if (latestAppt) {
            patientName = latestAppt.patient.user.name;
            if (latestAppt.status === 'IN_CONSULTATION') status = 'In Consultation';
            else if (latestAppt.status === 'CONFIRMED') status = 'Waiting';
          }
          return {
            room: `Room ${101 + i}`,
            doctor: d.user.name,
            doctorId: d.id,
            status,
            patientName
          };
        }))
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Secretary stats failed' });
  }
};
