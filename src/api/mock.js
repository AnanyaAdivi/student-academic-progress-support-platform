import { createId } from "./ids";
const users = [
    {
        id: "stu-1",
        name: "Alex Morgan",
        email: "alex@sau-demo.edu",
        role: "STUDENT",
        initials: "AM"
    },
    {
        id: "prof-1",
        name: "Dr. Sarah Chen",
        email: "s.chen@sau-demo.edu",
        role: "PROFESSOR",
        initials: "SC"
    },
    {
        id: "admin-1",
        name: "Platform Administrator",
        email: "admin@sau-demo.edu",
        role: "ADMIN",
        initials: "PA"
    }
];
const seedSlots = [
    {
        id: "s1",
        professorId: "prof-1",
        professor: "Dr. Sarah Chen",
        course: "Data Structures & Algorithms",
        courseCode: "CS 301",
        date: "2026-11-12",
        startsAt: "10:00",
        endsAt: "10:30",
        status: "OPEN"
    },
    {
        id: "s2",
        professorId: "prof-1",
        professor: "Dr. Sarah Chen",
        course: "Data Structures & Algorithms",
        courseCode: "CS 301",
        date: "2026-11-12",
        startsAt: "10:30",
        endsAt: "11:00",
        status: "OPEN"
    },
    {
        id: "s3",
        professorId: "prof-2",
        professor: "Prof. Michael Rivera",
        course: "Linear Algebra",
        courseCode: "MATH 204",
        date: "2026-11-13",
        startsAt: "14:00",
        endsAt: "14:30",
        status: "OPEN"
    },
    {
        id: "s4",
        professorId: "prof-2",
        professor: "Prof. Michael Rivera",
        course: "Linear Algebra",
        courseCode: "MATH 204",
        date: "2026-11-13",
        startsAt: "14:30",
        endsAt: "15:00",
        status: "OPEN"
    },
    {
        id: "s5",
        professorId: "prof-3",
        professor: "Prof. Emily Watson",
        course: "Academic Writing",
        courseCode: "ENG 210",
        date: "2026-11-16",
        startsAt: "11:00",
        endsAt: "11:30",
        status: "OPEN"
    },
    {
        id: "s6",
        professorId: "prof-3",
        professor: "Prof. Emily Watson",
        course: "Academic Writing",
        courseCode: "ENG 210",
        date: "2026-11-16",
        startsAt: "11:30",
        endsAt: "12:00",
        status: "OPEN"
    }
];
const seedRequests = [
    {
        id: "r1",
        slotId: "s1",
        studentId: "stu-1",
        student: "Alex Morgan",
        professor: "Dr. Sarah Chen",
        course: "Data Structures & Algorithms",
        topic: "Understanding graph traversal",
        date: "2026-11-12",
        time: "10:00–10:30",
        status: "PENDING",
        createdAt: "2026-11-10"
    },
    {
        id: "r2",
        slotId: "s3",
        studentId: "stu-1",
        student: "Alex Morgan",
        professor: "Prof. Michael Rivera",
        course: "Linear Algebra",
        topic: "Eigenvalues and eigenvectors",
        date: "2026-11-13",
        time: "14:00–14:30",
        status: "CONFIRMED",
        createdAt: "2026-11-08"
    },
    {
        id: "r3",
        slotId: "s5",
        studentId: "stu-1",
        student: "Alex Morgan",
        professor: "Prof. Emily Watson",
        course: "Academic Writing",
        topic: "Structuring a research paper",
        date: "2026-11-16",
        time: "11:00–11:30",
        status: "NEEDS_RESCHEDULE",
        createdAt: "2026-11-07",
        needsReschedule: true
    }
];
// Illustrative configuration. Not verified SAU regulations.
export const seedAcademicConfiguration = {
    grading: {
        scaleName: "Demo 10-point scale",
        maximumGradePoint: 10,
        gradePointMap: {
            "A+": 10,
            "A": 9,
            "A−": 8,
            "B+": 7,
            "B": 6,
            "B−": 5,
            "C": 4,
            "F": 0
        }
    },
    degree: {
        totalRequiredCredits: 160
    }
};
// SEMESTER 5: Current semester records.
const seedProgress = [
    {
        id: "c1",
        code: "CS 301",
        title: "Data Structures & Algorithms",
        grade: "A−",
        score: 87.14,
        progress: 70,
        academic: {
            credits: 4,
            gradePoints: 8,
            performance: {
                earnedMarks: 61,
                maximumMarks: 70,
                percentage: 87.14
            },
            completion: {
                completedUnits: 7,
                totalUnits: 10,
                percentage: 70
            }
        },
        assessments: [
            {
                title: "Assignment 3",
                score: 19,
                maxScore: 20,
                date: "2026-11-10",
                version: 1
            },
            {
                title: "Midterm",
                score: 42,
                maxScore: 50,
                date: "2026-11-02",
                version: 2
            }
        ]
    },
    {
        id: "c2",
        code: "CS 305",
        title: "Database Management Systems",
        grade: "B+",
        score: 90,
        progress: 75,
        academic: {
            credits: 4,
            gradePoints: 7,
            performance: {
                earnedMarks: 18,
                maximumMarks: 20,
                percentage: 90
            },
            completion: {
                completedUnits: 6,
                totalUnits: 8,
                percentage: 75
            }
        },
        assessments: [
            {
                title: "SQL Lab",
                score: 18,
                maxScore: 20,
                date: "2026-11-04",
                version: 1
            }
        ]
    },
    {
        id: "c3",
        code: "CS 310",
        title: "Software Engineering",
        grade: "A",
        score: 92,
        progress: 80,
        academic: {
            credits: 3,
            gradePoints: 9,
            performance: {
                earnedMarks: 46,
                maximumMarks: 50,
                percentage: 92
            },
            completion: {
                completedUnits: 8,
                totalUnits: 10,
                percentage: 80
            }
        },
        assessments: [
            {
                title: "Project review",
                score: 46,
                maxScore: 50,
                date: "2026-11-06",
                version: 1
            }
        ]
    },
    {
        id: "c4",
        code: "CS 312",
        title: "Computer Networks",
        grade: "B",
        score: 65,
        progress: 62.5,
        academic: {
            credits: 3,
            gradePoints: 6,
            performance: {
                earnedMarks: 13,
                maximumMarks: 20,
                percentage: 65
            },
            completion: {
                completedUnits: 5,
                totalUnits: 8,
                percentage: 62.5
            }
        },
        assessments: [
            {
                title: "Quiz 2",
                score: 13,
                maxScore: 20,
                date: "2026-11-03",
                version: 1
            }
        ]
    },
    {
        id: "c5",
        code: "MA 301",
        title: "Applied Mathematics III",
        grade: "A−",
        score: 82,
        progress: 60,
        academic: {
            credits: 3,
            gradePoints: 8,
            performance: {
                earnedMarks: 41,
                maximumMarks: 50,
                percentage: 82
            },
            completion: {
                completedUnits: 6,
                totalUnits: 10,
                percentage: 60
            }
        },
        assessments: [
            {
                title: "Midterm",
                score: 41,
                maxScore: 50,
                date: "2026-11-02",
                version: 1
            }
        ]
    },
    {
        id: "c6",
        code: "HU 302",
        title: "Technical Communication",
        grade: "B+",
        score: 70,
        progress: 87.5,
        academic: {
            credits: 2,
            gradePoints: 7,
            performance: {
                earnedMarks: 14,
                maximumMarks: 20,
                percentage: 70
            },
            completion: {
                completedUnits: 7,
                totalUnits: 8,
                percentage: 87.5
            }
        },
        assessments: [
            {
                title: "Presentation",
                score: 14,
                maxScore: 20,
                date: "2026-11-05",
                version: 1
            }
        ]
    }
];
// SEMESTER 3 AND SEMESTER 4: Historical records.
// These are illustrative demo records, not official SAU registrations.
const seedProgressBySemester = {
    3: [
        {
            id: "s3-c1",
            code: "CS 201",
            title: "Data Structures",
            grade: "A−",
            score: 84,
            progress: 90,
            academic: {
                credits: 4,
                gradePoints: 8,
                performance: {
                    earnedMarks: 84,
                    maximumMarks: 100,
                    percentage: 84
                },
                completion: {
                    completedUnits: 9,
                    totalUnits: 10,
                    percentage: 90
                }
            },
            assessments: [
                {
                    title: "Programming Assignment",
                    score: 84,
                    maxScore: 100,
                    date: "2025-11-18",
                    version: 1
                }
            ]
        },
        {
            id: "s3-c2",
            code: "MA 201",
            title: "Discrete Mathematics",
            grade: "B+",
            score: 76,
            progress: 80,
            academic: {
                credits: 4,
                gradePoints: 7,
                performance: {
                    earnedMarks: 76,
                    maximumMarks: 100,
                    percentage: 76
                },
                completion: {
                    completedUnits: 8,
                    totalUnits: 10,
                    percentage: 80
                }
            },
            assessments: [
                {
                    title: "Midterm Examination",
                    score: 76,
                    maxScore: 100,
                    date: "2025-11-20",
                    version: 1
                }
            ]
        },
        {
            id: "s3-c3",
            code: "CS 203",
            title: "Digital Logic Design",
            grade: "B",
            score: 68,
            progress: 70,
            academic: {
                credits: 3,
                gradePoints: 6,
                performance: {
                    earnedMarks: 68,
                    maximumMarks: 100,
                    percentage: 68
                },
                completion: {
                    completedUnits: 7,
                    totalUnits: 10,
                    percentage: 70
                }
            },
            assessments: [
                {
                    title: "Circuit Design Lab",
                    score: 68,
                    maxScore: 100,
                    date: "2025-11-22",
                    version: 1
                }
            ]
        },
        {
            id: "s3-c4",
            code: "CS 205",
            title: "Object-Oriented Programming",
            grade: "A",
            score: 91,
            progress: 90,
            academic: {
                credits: 3,
                gradePoints: 9,
                performance: {
                    earnedMarks: 91,
                    maximumMarks: 100,
                    percentage: 91
                },
                completion: {
                    completedUnits: 9,
                    totalUnits: 10,
                    percentage: 90
                }
            },
            assessments: [
                {
                    title: "Java Practical",
                    score: 91,
                    maxScore: 100,
                    date: "2025-11-25",
                    version: 1
                }
            ]
        },
        {
            id: "s3-c5",
            code: "EC 201",
            title: "Computer Organization",
            grade: "B+",
            score: 79,
            progress: 70,
            academic: {
                credits: 3,
                gradePoints: 7,
                performance: {
                    earnedMarks: 79,
                    maximumMarks: 100,
                    percentage: 79
                },
                completion: {
                    completedUnits: 7,
                    totalUnits: 10,
                    percentage: 70
                }
            },
            assessments: [
                {
                    title: "Class Test",
                    score: 79,
                    maxScore: 100,
                    date: "2025-11-27",
                    version: 1
                }
            ]
        },
        {
            id: "s3-c6",
            code: "HU 201",
            title: "Communication Skills",
            grade: "A",
            score: 88,
            progress: 80,
            academic: {
                credits: 3,
                gradePoints: 9,
                performance: {
                    earnedMarks: 88,
                    maximumMarks: 100,
                    percentage: 88
                },
                completion: {
                    completedUnits: 8,
                    totalUnits: 10,
                    percentage: 80
                }
            },
            assessments: [
                {
                    title: "Presentation",
                    score: 88,
                    maxScore: 100,
                    date: "2025-11-29",
                    version: 1
                }
            ]
        }
    ],
    4: [
        {
            id: "s4-c1",
            code: "CS 221",
            title: "Database Systems",
            grade: "A−",
            score: 86,
            progress: 80,
            academic: {
                credits: 4,
                gradePoints: 8,
                performance: {
                    earnedMarks: 86,
                    maximumMarks: 100,
                    percentage: 86
                },
                completion: {
                    completedUnits: 8,
                    totalUnits: 10,
                    percentage: 80
                }
            },
            assessments: [
                {
                    title: "SQL Practical",
                    score: 86,
                    maxScore: 100,
                    date: "2026-04-10",
                    version: 1
                }
            ]
        },
        {
            id: "s4-c2",
            code: "CS 223",
            title: "Operating Systems",
            grade: "B+",
            score: 78,
            progress: 70,
            academic: {
                credits: 4,
                gradePoints: 7,
                performance: {
                    earnedMarks: 78,
                    maximumMarks: 100,
                    percentage: 78
                },
                completion: {
                    completedUnits: 7,
                    totalUnits: 10,
                    percentage: 70
                }
            },
            assessments: [
                {
                    title: "Midterm Examination",
                    score: 78,
                    maxScore: 100,
                    date: "2026-04-12",
                    version: 1
                }
            ]
        },
        {
            id: "s4-c3",
            code: "CS 225",
            title: "Computer Networks",
            grade: "B",
            score: 72,
            progress: 70,
            academic: {
                credits: 3,
                gradePoints: 6,
                performance: {
                    earnedMarks: 72,
                    maximumMarks: 100,
                    percentage: 72
                },
                completion: {
                    completedUnits: 7,
                    totalUnits: 10,
                    percentage: 70
                }
            },
            assessments: [
                {
                    title: "Network Lab",
                    score: 72,
                    maxScore: 100,
                    date: "2026-04-15",
                    version: 1
                }
            ]
        },
        {
            id: "s4-c4",
            code: "MA 222",
            title: "Probability and Statistics",
            grade: "A",
            score: 90,
            progress: 90,
            academic: {
                credits: 3,
                gradePoints: 9,
                performance: {
                    earnedMarks: 90,
                    maximumMarks: 100,
                    percentage: 90
                },
                completion: {
                    completedUnits: 9,
                    totalUnits: 10,
                    percentage: 90
                }
            },
            assessments: [
                {
                    title: "Problem Set",
                    score: 90,
                    maxScore: 100,
                    date: "2026-04-18",
                    version: 1
                }
            ]
        },
        {
            id: "s4-c5",
            code: "CS 227",
            title: "Design and Analysis of Algorithms",
            grade: "B+",
            score: 81,
            progress: 80,
            academic: {
                credits: 3,
                gradePoints: 7,
                performance: {
                    earnedMarks: 81,
                    maximumMarks: 100,
                    percentage: 81
                },
                completion: {
                    completedUnits: 8,
                    totalUnits: 10,
                    percentage: 80
                }
            },
            assessments: [
                {
                    title: "Algorithm Assignment",
                    score: 81,
                    maxScore: 100,
                    date: "2026-04-20",
                    version: 1
                }
            ]
        },
        {
            id: "s4-c6",
            code: "HU 220",
            title: "Technical Writing",
            grade: "A−",
            score: 85,
            progress: 90,
            academic: {
                credits: 2,
                gradePoints: 8,
                performance: {
                    earnedMarks: 85,
                    maximumMarks: 100,
                    percentage: 85
                },
                completion: {
                    completedUnits: 9,
                    totalUnits: 10,
                    percentage: 90
                }
            },
            assessments: [
                {
                    title: "Research Report",
                    score: 85,
                    maxScore: 100,
                    date: "2026-04-22",
                    version: 1
                }
            ]
        }
    ]
};
const seedActivity = [
    {
        id: "a1",
        title: "Assignment grade published",
        description: "Data Structures & Algorithms · Scored 19/20 on Assignment 3.",
        date: "Today · 9:15 AM",
        kind: "grade",
        actor: "Dr. Sarah Chen"
    },
    {
        id: "a2",
        title: "Midterm result updated",
        description: "Applied Mathematics III · Your midterm grade has been updated.",
        date: "Nov 02 · 3:40 PM",
        kind: "grade",
        actor: "Prof. Michael Rivera"
    },
    {
        id: "a3",
        title: "Academic record updated",
        description: "Fall 2026 · Semester 5 · All 6 course registrations confirmed.",
        date: "Nov 01 · 11:20 AM",
        kind: "record"
    }
];
const STORAGE = "sap_mock_state";
function state() {
    try {
        const saved = localStorage.getItem(STORAGE);
        if (saved) {
            const parsed = JSON.parse(saved);
            const migratedProgress = (parsed.progress ?? seedProgress).map(course => {
                const demoCourse = seedProgress.find(item => item.id === course.id);
                const academic = course.academic ?? demoCourse?.academic ?? {
                    credits: 0,
                    gradePoints: null,
                    performance: {
                        earnedMarks: 0,
                        maximumMarks: 0,
                        percentage: null
                    },
                    completion: {
                        completedUnits: 0,
                        totalUnits: 0,
                        percentage: null
                    }
                };
                return {
                    ...course,
                    academic,
                    score: academic.performance.percentage ?? course.score,
                    progress: academic.completion.percentage ?? course.progress
                };
            });
            return {
                user: parsed.user ?? users[0],
                slots: parsed.slots ?? seedSlots,
                requests: parsed.requests ?? seedRequests,
                progress: migratedProgress,
                activity: parsed.activity ?? seedActivity,
                academicConfiguration: parsed.academicConfiguration ?? seedAcademicConfiguration
            };
        }
    }
    catch {
        // Reset invalid demo state.
    }
    return {
        user: users[0],
        slots: seedSlots,
        requests: seedRequests,
        progress: seedProgress,
        activity: seedActivity,
        academicConfiguration: seedAcademicConfiguration
    };
}
function save(s) {
    localStorage.setItem(STORAGE, JSON.stringify(s));
}
function response(config, data, status = 200) {
    return {
        data,
        status,
        statusText: status === 200 ? "OK" : "Error",
        headers: {},
        config
    };
}
function fail(config, code, status, message) {
    return response(config, {
        error: code,
        message,
        requestId: createId(),
        suggestedAlternatives: []
    }, status);
}
const delay = () => new Promise(resolve => setTimeout(resolve, 280));
export const mockAdapter = async (config) => {
    await delay();
    const s = state();
    const method = (config.method || "get").toLowerCase();
    const url = (config.url || "")
        .split("?")[0]
        .replace(/^\/+/, "");
    const body = (config.data
        ? typeof config.data === "string"
            ? JSON.parse(config.data)
            : config.data
        : {});
    const urlParts = url.split("/").filter(Boolean);
    const id = urlParts[urlParts.length - 1] || "";
    let data = {};
    let status = 200;
    // AUTHENTICATION
    if (url === "auth/login" && method === "post") {
        const role = String(body.role || "STUDENT");
        s.user = users.find(user => user.role === role) || users[0];
        save(s);
        data = { user: s.user };
    }
    else if (url === "auth/logout" && method === "post") {
        s.user = null;
        save(s);
        data = { success: true };
    }
    else if (url === "me" && method === "get") {
        if (!s.user) {
            return fail(config, "UNAUTHENTICATED", 401, "Sign in required");
        }
        data = s.user;
        // SUPPORT SLOTS
    }
    else if (url === "slots" && method === "get") {
        data = s.slots.filter(slot => slot.status === "OPEN");
    }
    else if (url === "slots" && method === "post") {
        const slot = {
            id: createId(),
            professorId: s.user?.id || "prof-1",
            professor: s.user?.name || "Professor",
            course: String(body.course),
            courseCode: String(body.courseCode || "CS 301"),
            date: String(body.date),
            startsAt: String(body.startsAt),
            endsAt: String(body.endsAt),
            status: "OPEN"
        };
        s.slots.unshift(slot);
        save(s);
        data = slot;
        status = 201;
    }
    else if (url.startsWith("slots/") && method === "delete") {
        const slot = s.slots.find(slot => slot.id === id);
        if (slot) {
            slot.status = "CANCELLED";
        }
        save(s);
        data = { success: true };
        // STUDENT SUPPORT REQUESTS
    }
    else if (/^slots\/[^/]+\/requests$/.test(url) &&
        method === "post") {
        const slotId = url.split("/")[1];
        const slot = s.slots.find(item => item.id === slotId);
        if (!slot ||
            slot.status !== "OPEN" ||
            s.requests.some(request => request.slotId === slotId &&
                request.status === "CONFIRMED")) {
            return fail(config, "SLOT_ALREADY_CONFIRMED", 409, "Slot unavailable");
        }
        const duplicateRequest = s.requests.some(request => request.slotId === slotId &&
            request.studentId === (s.user?.id || "stu-1") &&
            ["PENDING", "CONFIRMED"].includes(request.status));
        if (duplicateRequest) {
            return fail(config, "DUPLICATE_REQUEST", 409, "You already have an active request for this slot.");
        }
        const req = {
            id: createId(),
            slotId,
            studentId: s.user?.id || "stu-1",
            student: s.user?.name || "Alex Morgan",
            professor: slot.professor,
            course: slot.course,
            topic: String(body.topic || "Academic support"),
            date: slot.date,
            time: `${slot.startsAt}–${slot.endsAt}`,
            status: "PENDING",
            createdAt: new Date().toISOString()
        };
        s.requests.unshift(req);
        save(s);
        data = req;
        status = 201;
    }
    else if (url === "requests" && method === "get") {
        data = s.requests.filter(request => s.user?.role === "PROFESSOR"
            ? true
            : request.studentId === s.user?.id);
    }
    else if (url.startsWith("requests/") &&
        url.endsWith("/confirm") &&
        method === "post") {
        const req = s.requests.find(request => request.id === url.split("/")[1]);
        if (!req || req.status !== "PENDING") {
            return fail(config, "REQUEST_NOT_PENDING", 409, "Request no longer pending");
        }
        const winner = s.requests.find(request => request.slotId === req.slotId &&
            request.status === "CONFIRMED");
        if (winner) {
            return fail(config, "SLOT_ALREADY_CONFIRMED", 409, "Slot already confirmed");
        }
        const [requestedStart, requestedEnd] = req.time.split("–");
        const toMinutes = (value) => {
            const [hours, minutes] = value.split(":").map(Number);
            return hours * 60 + minutes;
        };
        const requestedStartMinutes = toMinutes(requestedStart);
        const requestedEndMinutes = toMinutes(requestedEnd);
        const studentConflict = s.requests.some(request => {
            if (request.id === req.id ||
                request.studentId !== req.studentId ||
                request.status !== "CONFIRMED" ||
                request.date !== req.date)
                return false;
            const [existingStart, existingEnd] = request.time.split("–");
            return (requestedStartMinutes < toMinutes(existingEnd) &&
                requestedEndMinutes > toMinutes(existingStart));
        });
        if (studentConflict) {
            return fail(config, "STUDENT_TIME_CONFLICT", 409, "This student already has a confirmed session during that time.");
        }
        req.status = "CONFIRMED";
        s.requests
            .filter(request => request.slotId === req.slotId &&
            request.id !== req.id &&
            request.status === "PENDING")
            .forEach(request => {
            request.status = "NEEDS_RESCHEDULE";
            request.needsReschedule = true;
        });
        save(s);
        data = req;
    }
    else if (url.startsWith("requests/") &&
        url.endsWith("/cancel") &&
        method === "post") {
        const req = s.requests.find(request => request.id === url.split("/")[1]);
        if (req) {
            req.status = "CANCELLED";
        }
        save(s);
        data = req;
    }
    else if (url.startsWith("requests/") &&
        url.endsWith("/reschedule") &&
        method === "post") {
        const req = s.requests.find(request => request.id === url.split("/")[1]);
        if (req) {
            const slot = s.slots.find(item => item.id === String(body.slotId));
            if (slot) {
                req.slotId = slot.id;
                req.date = slot.date;
                req.time = `${slot.startsAt}–${slot.endsAt}`;
                req.status = "PENDING";
                req.needsReschedule = false;
            }
        }
        save(s);
        data = req;
        // SEMESTER-SPECIFIC ACADEMIC PROGRESS
    }
    else if (url.startsWith("students/") &&
        url.includes("/progress") &&
        method === "get") {
        const params = (config.params ?? {});
        const queryString = (config.url || "").split("?")[1] || "";
        const queryAsOf = new URLSearchParams(queryString).get("asOf") || undefined;
        const asOf = String(params.asOf ?? queryAsOf ?? "") || undefined;
        // Historical semesters return distinct course arrays.
        // Semester 5 returns the saved current-semester records.
        if (!asOf) {
            data = s.progress;
        }
        else if (asOf <= "2025-12-31") {
            data = seedProgressBySemester[3];
        }
        else if (asOf <= "2026-05-31") {
            data = seedProgressBySemester[4];
        }
        else {
            data = s.progress;
        }
    }
    else if (url.startsWith("students/") &&
        url.endsWith("/history") &&
        method === "get") {
        data = s.activity;
        // GRADE OPERATIONS
    }
    else if (url.startsWith("assessments/") &&
        url.endsWith("/grades") &&
        method === "post") {
        data = { success: true };
        status = 201;
    }
    else if (url.startsWith("grades/") &&
        url.endsWith("/correct") &&
        method === "post") {
        data = { success: true };
        status = 201;
        // ADMIN
    }
    else if (url === "admin/audit/verify" && method === "get") {
        data = {
            valid: true,
            checkedEvents: 1248,
            verifiedAt: new Date().toISOString(),
            firstBrokenRow: null
        };
    }
    else if (url === "admin/users" && method === "get") {
        data = users.map(user => ({
            ...user,
            active: true,
            joined: "Aug 2026"
        }));
    }
    else {
        data = {};
    }
    save(s);
    return response(config, data, status);
};
