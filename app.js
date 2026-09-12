"use strict";

/*
=========================================================
KOYE FECHE YOHANIS BEGENA
Private Church Learning Platform

CURRENT BUILD
---------------------------------------------------------
✅ Supabase Authentication
✅ Student ID + password login
✅ Real user profiles
✅ Database-controlled roles
✅ One Begena Class
✅ Real student enrollment
✅ Real student class lookup
✅ Real student attendance
✅ Real attendance percentage
✅ Real mentor attendance
✅ Real attendance saving
✅ Student / Mentor navigation
✅ Begena
✅ Mekagna
✅ Mezmur
✅ Tutor
✅ Assignments UI
✅ Announcements UI
✅ Certificates UI

IMPORTANT
---------------------------------------------------------
No fake attendance is created.
No fake students are created.
Attendance comes from Supabase.
=========================================================
*/


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
    "https://tgckbznefwexvgttkgha.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_l33SP3R9pgo-TJbhUktfGQ_8yzG60Db";

let supabaseClient = null;
let announcementRecorder = null;
let announcementAudioChunks = [];
let announcementAudioBlob = null;

function initializeSupabase() {

    try {

        if (
            window.supabase &&
            typeof window.supabase.createClient === "function"
        ) {

            supabaseClient =
                window.supabase.createClient(
                    SUPABASE_URL,
                    SUPABASE_KEY
                );

            console.log(
                "✅ Supabase client initialized"
            );

            return true;

        }

        console.warn(
            "⚠️ Supabase library unavailable"
        );

        return false;

    } catch (error) {

        console.error(
            "❌ Supabase initialization failed:",
            error
        );

        return false;

    }

}


initializeSupabase();


/* =========================================================
   APP STATE
========================================================= */

const state = {

    role: "student",

    page: "home",

    language: "am",

    selectedPreset: "Selamta",

    selectedString: null,

    listening: false,

    currentClass: null,

    mentorClasses: [],

    studentAttendance: [],

    mentorAttendanceStudents: [],

    mentorStudentProgress: {},

    mentorAttendanceStatuses: {},

    attendanceDate: getTodayLocalDate(),
    
    selectedMezmurId: null,
};
let mekagnaListening = false;
let mekagnaStream = null;
let mekagnaAudioContext = null;
let mekagnaAnalyser = null;
let mekagnaMicrophone = null;
let mekagnaAnimationFrame = null;
let mekagnaSilentGain = null;
/* =========================================================
   BEGENA AUDIO
========================================================= */

const begenaAudio = {

    Selamta: {

        1: new Audio("./audio/begena/selamta/bf2.ogg"),
        4: new Audio("./audio/begena/selamta/bc2.ogg"),
        6: new Audio("./audio/begena/selamta/bd2.ogg"),
        8: new Audio("./audio/begena/selamta/ba2.ogg"),
        10: new Audio("./audio/begena/selamta/bg2.ogg")

    },
      Tizita: {
    1: new Audio("./audio/begena/tizita/be2.ogg"),
    4: new Audio("./audio/begena/tizita/bc2.ogg"),
    6: new Audio("./audio/begena/tizita/bd2.ogg"),
    8: new Audio("./audio/begena/tizita/ba2.ogg"),
    10: new Audio("./audio/begena/tizita/bg2.ogg")
  },
    "Sile Chernet": {
    1: new Audio("./audio/begena/sile-chernet/bf2.ogg"),
    4: new Audio("./audio/begena/sile-chernet/bc2.ogg"),
    6: new Audio("./audio/begena/sile-chernet/bcs2.ogg"),
    8: new Audio("./audio/begena/sile-chernet/ba2.ogg"),
    10: new Audio("./audio/begena/sile-chernet/bfs2.ogg")
  }
};


/* =========================================================
   DATE HELPER
========================================================= */

function getTodayLocalDate() {

    const now =
        new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );

    return `${year}-${month}-${day}`;

}


/* =========================================================
   ELEMENT HELPER
========================================================= */

function get(id) {

    return document.getElementById(id);

}


/* =========================================================
   SAFE HTML
========================================================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}

/* =========================================================
   OFFLINE STUDENT LOGIN
========================================================= */

const OFFLINE_STUDENT_KEY =
    "koye_feche_offline_student_v1";

async function cacheStudentOfflineContent() {

    if (
        !supabaseClient ||
        !window.currentUser ||
        window.currentUser.offline ||
        window.currentProfile?.role !== "student"
    ) {

        return;

    }

    const userId =
        window.currentUser.id;

    const classId =
        state.currentClass?.id;

    if (!classId) {

        console.warn(
            "⚠️ Cannot cache student content: no class ID."
        );

        return;

    }

    console.log(
        "📦 Saving student offline content..."
    );


    /* =========================
       ATTENDANCE
    ========================= */

    try {

        await loadStudentAttendance(
            userId
        );

    } catch (error) {

        console.warn(
            "Attendance offline cache failed:",
            error
        );

    }


    /* =========================
       MEZMUR
    ========================= */

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("mezmur")
                .select(`
                    id,
                    title_am,
                    title_en,
                    lyrics_am,
                    meaning_en,
                    qenet,
                    level,
                    audio_path,
                    published,
                    created_at
                `)
                .eq(
                    "published",
                    true
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (!error) {

            saveOfflineContent(
                "mezmur",
                data || []
            );

        }

    } catch (error) {

        console.warn(
            "Mezmur offline cache failed:",
            error
        );

    }


    /* =========================
       TUTOR
    ========================= */

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("lessons")
                .select(`
                    id,
                    title_am,
                    title_en,
                    body_am,
                    body_en,
                    level,
                    lesson_number,
                    action_type,
                    action_target
                `)
                .eq(
                    "class_id",
                    classId
                )
                .eq(
                    "published",
                    true
                )
                .order(
                    "lesson_number",
                    {
                        ascending: true
                    }
                );

        if (!error) {

            saveOfflineContent(
                `lessons_${classId}`,
                data || []
            );

        }

    } catch (error) {

        console.warn(
            "Tutor offline cache failed:",
            error
        );

    }


    /* =========================
       ASSIGNMENTS
    ========================= */

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("assignments")
                .select(`
                    id,
                    title_am,
                    title_en,
                    instructions_am,
                    instructions_en,
                    due_at,
                    status,
                    created_at
                `)
                .eq(
                    "class_id",
                    classId
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (!error) {

            saveOfflineContent(
                `assignments_${classId}`,
                data || []
            );

        }

    } catch (error) {

        console.warn(
            "Assignments offline cache failed:",
            error
        );

    }


    /* =========================
       LEADERBOARD
    ========================= */

    try {

        const {
            data,
            error
        } =
            await supabaseClient.rpc(
                "get_class_leaderboard",
                {
                    p_class_id: classId
                }
            );

        if (!error) {

            saveOfflineContent(
                `leaderboard_${classId}`,
                data || []
            );

        }

    } catch (error) {

        console.warn(
            "Leaderboard offline cache failed:",
            error
        );

    }


    /* =========================
       ANNOUNCEMENTS
    ========================= */

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("announcements")
                .select(`
                    id,
                    title,
                    body,
                    audio_path,
                    published_at,
                    created_at
                `)
                .eq(
                    "target_class_id",
                    classId
                )
                .eq(
                    "published",
                    true
                )
                .order(
                    "published_at",
                    {
                        ascending: false
                    }
                );

        if (!error) {

            const announcementList =
                data || [];

            for (
                const announcement
                of announcementList
            ) {

                announcement._offlineAudioUrl =
                    "";

                if (
                    announcement.audio_path
                ) {

                    try {

                        const {
                            data: signedData,
                            error: signedError
                        } =
                            await supabaseClient
                                .storage
                                .from(
                                    "announcement-audio"
                                )
                                .createSignedUrl(
                                    announcement.audio_path,
                                    3600
                                );

                        if (
                            !signedError
                        ) {

                            announcement
                                ._offlineAudioUrl =
                                    signedData
                                        ?.signedUrl ||
                                    "";

                        }

                    } catch (
                        audioError
                    ) {

                        console.warn(
                            "Announcement audio cache failed:",
                            audioError
                        );

                    }

                }

            }

            saveOfflineContent(
                `announcements_${classId}`,
                announcementList
            );

        }

    } catch (error) {

        console.warn(
            "Announcements offline cache failed:",
            error
        );

    }


    console.log(
        "✅ Student offline content saved"
    );

}
function arrayBufferToBase64(buffer) {

    const bytes =
        new Uint8Array(buffer);

    let binary = "";

    bytes.forEach(
        byte => {
            binary += String.fromCharCode(
                byte
            );
        }
    );

    return btoa(binary);

}
/* =========================================================
   OFFLINE STUDENT CONTENT CACHE
========================================================= */

const OFFLINE_CONTENT_PREFIX =
    "kfy_student_content_v1:";


function saveOfflineContent(
    key,
    data
) {

    try {

        localStorage.setItem(
            OFFLINE_CONTENT_PREFIX + key,
            JSON.stringify({
                version: 1,
                savedAt:
                    new Date().toISOString(),
                data: data
            })
        );

        console.log(
            "✅ Offline content saved:",
            key
        );

        return true;

    } catch (error) {

        console.error(
            "❌ Offline content save failed:",
            key,
            error
        );

        return false;

    }

}


function getOfflineContent(
    key,
    fallback = null
) {

    try {

        const raw =
            localStorage.getItem(
                OFFLINE_CONTENT_PREFIX + key
            );

        if (!raw) {
            return fallback;
        }

        const parsed =
            JSON.parse(raw);

        if (
            !parsed ||
            parsed.version !== 1
        ) {

            return fallback;

        }

        return parsed.data;

    } catch (error) {

        console.error(
            "❌ Offline content read failed:",
            key,
            error
        );

        return fallback;

    }

}


function base64ToArrayBuffer(base64) {

    const binary =
        atob(base64);

    const bytes =
        new Uint8Array(
            binary.length
        );

    for (
        let i = 0;
        i < binary.length;
        i++
    ) {

        bytes[i] =
            binary.charCodeAt(i);

    }

    return bytes.buffer;

}


function generateOfflineSalt() {

    const salt =
        new Uint8Array(16);

    crypto.getRandomValues(
        salt
    );

    return arrayBufferToBase64(
        salt.buffer
    );

}


async function hashOfflinePassword(
    password,
    saltBase64
) {

    if (
        !window.crypto ||
        !window.crypto.subtle
    ) {

        throw new Error(
            "Browser cryptography is unavailable."
        );

    }

    const encoder =
        new TextEncoder();

    const keyMaterial =
        await crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            "PBKDF2",
            false,
            ["deriveBits"]
        );

    const salt =
        base64ToArrayBuffer(
            saltBase64
        );

    const derivedBits =
        await crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                salt,
                iterations: 120000,
                hash: "SHA-256"
            },
            keyMaterial,
            256
        );

    return arrayBufferToBase64(
        derivedBits
    );

}


async function saveOfflineStudentCredentials(
    studentId,
    password,
    user,
    profile
) {

    if (
        !user ||
        !profile ||
        profile.role !== "student"
    ) {

        return false;

    }

    try {

        const salt =
            generateOfflineSalt();

        const passwordHash =
            await hashOfflinePassword(
                password,
                salt
            );

        const offlineData = {

            version: 1,

            userId:
                user.id,

            email:
                user.email,

            studentId:
                studentId,

            passwordHash:
                passwordHash,

            salt:
                salt,

            profile:
                profile,

            currentClass:
                state.currentClass || null,

            studentAttendance:
                state.studentAttendance || [],

            savedAt:
                new Date().toISOString()

        };

        localStorage.setItem(
            OFFLINE_STUDENT_KEY,
            JSON.stringify(
                offlineData
            )
        );

        console.log(
            "✅ Offline student login saved"
        );

        return true;

    } catch (error) {

        console.error(
            "❌ Failed to save offline login:",
            error
        );

        return false;

    }

}


async function loginOfflineStudent(
    studentId,
    password,
    errorElement
) {

    try {

        const saved =
            localStorage.getItem(
                OFFLINE_STUDENT_KEY
            );

        if (!saved) {

            if (errorElement) {

                errorElement.textContent =
                    "No offline account is available on this device. Please connect to the internet and log in once.";

            }

            return false;

        }

        const offlineData =
            JSON.parse(saved);

        if (
            !offlineData ||
            offlineData.version !== 1
        ) {

            if (errorElement) {

                errorElement.textContent =
                    "Offline login data is unavailable. Please connect to the internet.";

            }

            return false;

        }

        if (
            offlineData.studentId !==
            studentId
        ) {

            if (errorElement) {

                errorElement.textContent =
                    "This Student ID is not registered for offline use on this device.";

            }

            return false;

        }

        const passwordHash =
            await hashOfflinePassword(
                password,
                offlineData.salt
            );

        if (
            passwordHash !==
            offlineData.passwordHash
        ) {

            if (errorElement) {

                errorElement.textContent =
                    "Invalid Student ID or password.";

            }

            return false;

        }

        if (
            !offlineData.profile ||
            offlineData.profile.role !==
                "student"
        ) {

            if (errorElement) {

                errorElement.textContent =
                    "Offline student profile is unavailable.";

            }

            return false;

        }

        window.currentUser = {

            id:
                offlineData.userId,

            email:
                offlineData.email,

            offline:
                true

        };

        window.currentProfile =
            offlineData.profile;

        state.role =
            "student";

        state.page =
            "home";

        state.currentClass =
            offlineData.currentClass ||
            null;

        state.studentAttendance =
            Array.isArray(
                offlineData.studentAttendance
            )
                ? offlineData.studentAttendance
                : [];

        sessionStorage.setItem(
            "begena_authenticated",
            "true"
        );

        await showApp();

        await render();

        showToast(
            "✅ Offline login successful"
        );

        console.log(
            "✅ Student logged in offline"
        );

        return true;

    } catch (error) {

        console.error(
            "❌ Offline login failed:",
            error
        );

        if (errorElement) {

            errorElement.textContent =
                "Offline login could not be completed.";

        }

        return false;

    }

}
/* =========================================================
   DATE DISPLAY
========================================================= */

function formatDate(dateValue) {

    if (!dateValue) {

        return "—";

    }


    const date =
        new Date(
            `${dateValue}T00:00:00`
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return dateValue;

    }


    return new Intl.DateTimeFormat(
        state.language === "am"
            ? "am-ET"
            : "en-US",
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    ).format(date);

}


/* =========================================================
   AUTH UI
========================================================= */

async function showLoginPage() {

    const loginPage =
        get("login-page");

    const appShell =
        get("app-shell");


    if (loginPage) {

        loginPage.style.display =
            "flex";

    }


    if (appShell) {

        appShell.style.display =
            "none";

    }

}


async function showApp() {

    const loginPage =
        get("login-page");

    const appShell =
        get("app-shell");


    if (loginPage) {

        loginPage.style.display =
            "none";

    }


    if (appShell) {

        appShell.style.display =
            "grid";

    }

}


/* =========================================================
   LOAD PROFILE
========================================================= */

async function loadUserProfile(userId) {

    if (
        !supabaseClient ||
        !userId
    ) {

        return null;

    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("profiles")
                .select(
                    "id, full_name, role, student_id, phone, avatar_url, preferred_language, created_at, updated_at"
                )
                .eq(
                    "id",
                    userId
                )
                .single();


        if (error) {

            console.error(
                "❌ Profile loading failed:",
                error
            );

            return null;

        }


        return data;

    } catch (error) {

        console.error(
            "❌ Profile request failed:",
            error
        );

        return null;

    }

}


/* =========================================================
   APPLY PROFILE
========================================================= */

function applyUserProfile(profile) {

    if (!profile) {

        return false;

    }


    const validRoles = [
        "student",
        "mentor",
        "admin"
    ];


    if (
        !validRoles.includes(
            profile.role
        )
    ) {

        console.error(
            "❌ Invalid profile role:",
            profile.role
        );

        return false;

    }


    window.currentProfile =
        profile;


    state.role =
        profile.role;


    if (
        profile.preferred_language === "am" ||
        profile.preferred_language === "en"
    ) {

        state.language =
            profile.preferred_language;

    }


    state.page =
        profile.role === "student"
            ? "home"
            : "dashboard";


    return true;

}


/* =========================================================
   PROFILE UI
========================================================= */

function updateProfileUI() {

    const profile =
        window.currentProfile;


    if (!profile) {

        return;

    }


    const name =
        profile.full_name ||
        "User";


    const initial =
        name
            .trim()
            .charAt(0)
            .toUpperCase() ||
        "U";


    const profileCircle =
        document.querySelector(
            ".profile-circle"
        );


    if (profileCircle) {

        profileCircle.textContent =
            initial;

        profileCircle.title =
            name;

    }


    const languageButton =
        get("language-button");


    if (languageButton) {

        languageButton.textContent =
            state.language === "am"
                ? "EN"
                : "አማ";

    }

}


/* =========================================================
   STUDENT CLASS
========================================================= */

async function loadStudentClass(userId) {

    state.currentClass =
        null;


    if (
        !supabaseClient ||
        !userId
    ) {

        return null;

    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("enrollments")
                .select(`
                    id,
                    status,
                    joined_at,
                    classes (
                        id,
                        name,
                        level,
                        description,
                        active,
                        course_completed
                    )
                `)
                .eq(
                    "student_id",
                    userId
                )
                .eq(
                    "status",
                    "active"
                )
                .order(
                    "joined_at",
                    {
                        ascending: false
                    }
                )
                .limit(1);


        if (error) {

            console.warn(
                "⚠️ Student class lookup failed:",
                error.message
            );

            return null;

        }


        const enrollment =
            data?.[0];


        if (!enrollment?.classes) {

            return null;

        }


        state.currentClass =
            enrollment.classes;


        return state.currentClass;

    } catch (error) {

        console.warn(
            "⚠️ Student class request failed:",
            error
        );

        return null;

    }

}


/* =========================================================
   MENTOR CLASSES
========================================================= */

async function loadMentorClasses(userId) {

    state.mentorClasses =
        [];


    if (
        !supabaseClient ||
        !userId
    ) {

        return [];

    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("class_mentors")
                .select(`
                    class_id,
                    classes (
                        id,
                        name,
                        level,
                        description,
                        active,
                        course_completed
                    )
                `)
                .eq(
                    "mentor_id",
                    userId
                );


        if (error) {

            console.warn(
                "⚠️ Mentor class lookup failed:",
                error.message
            );

            return [];

        }


        state.mentorClasses =
            (data || [])
                .map(
                    row =>
                        row.classes
                )
                .filter(
                    Boolean
                );


        return state.mentorClasses;

    } catch (error) {

        console.warn(
            "⚠️ Mentor class request failed:",
            error
        );

        return [];

    }

}


/* =========================================================
   STUDENT ATTENDANCE
========================================================= */

async function loadStudentAttendance(userId) {

    state.studentAttendance =
        [];


    if (!userId) {

    return [];

}

if (!supabaseClient) {

    const cachedAttendance =
        getOfflineContent(
            `attendance_${userId}`,
            []
        );

    state.studentAttendance =
        Array.isArray(cachedAttendance)
            ? cachedAttendance
            : [];

    return state.studentAttendance;

}


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("attendance")
                .select(`
                    id,
                    class_id,
                    attendance_date,
                    status,
                    note,
                    created_at,
                    classes (
                        id,
                        name,
                        level
                    )
                `)
                .eq(
                    "student_id",
                    userId
                )
                .order(
                    "attendance_date",
                    {
                        ascending: false
                    }
                );


        if (error) {

    console.warn(
        "⚠️ Student attendance lookup failed:",
        error.message
    );

    const cachedAttendance =
        getOfflineContent(
            `attendance_${userId}`,
            []
        );

    state.studentAttendance =
        Array.isArray(cachedAttendance)
            ? cachedAttendance
            : [];

    return state.studentAttendance;

}


        state.studentAttendance =
            data || [];
            saveOfflineContent(
    `attendance_${userId}`,
    state.studentAttendance
);


        return state.studentAttendance;

    } catch (error) {

        console.warn(
            "⚠️ Student attendance request failed:",
            error
        );

        return [];

    }

}


/* =========================================================
   ATTENDANCE CALCULATION
========================================================= */

function calculateAttendanceStats(records) {

    const stats = {

        total: 0,

        present: 0,

        late: 0,

        absent: 0,

        excused: 0,

        percentage: 0

    };


    if (!Array.isArray(records)) {

        return stats;

    }


    stats.total =
        records.length;


    records.forEach(
        record => {

            switch (
                record.status
            ) {

                case "present":

                    stats.present++;

                    break;

                case "late":

                    stats.late++;

                    break;

                case "absent":

                    stats.absent++;

                    break;

                case "excused":

                    stats.excused++;

                    break;

            }

        }
    );


    /*
        Present = fully present.
        Late counts as attended but is not
        treated as perfect attendance.

        Percentage:
        (present + 0.5 × late + excused) / total
    */

    if (stats.total > 0) {

        stats.percentage =
            Math.round(
                (
                    (
                        stats.present +
                        (
                            stats.late *
                            0.5
                        ) +
                        stats.excused
                    )
                    /
                    stats.total
                ) *
                100
            );

    }


    return stats;

}


/* =========================================================
   LOAD MENTOR ATTENDANCE STUDENTS
========================================================= */
async function finishCourse() {
    const classId =
        state.mentorClasses?.[0]?.id;

    if (!classId) {
        showToast(
            "❌ ክፍል አልተገኘም።"
        );
        return;
    }

    const confirmed =
        confirm(
            "እርግጠኛ ነህ? ይህ ክፍሉን በይፋ ያጠናቅቃል።"
        );

    if (!confirmed) {
        return;
    }

    const {
        error
    } = await supabaseClient
        .from("classes")
        .update({
            course_completed: true
        })
        .eq(
            "id",
            classId
        );

    if (error) {
        console.error(
            "❌ FINISH COURSE ERROR:",
            error
        );

        showToast(
            "❌ ክፍሉን ማጠናቀቅ አልተቻለም።"
        );

        return;
    }

    const classroom =
        state.mentorClasses.find(
            classroom =>
                classroom.id === classId
        );

    if (classroom) {
        classroom.course_completed =
            true;
    }

    showToast(
        "✅ ክፍሉ ተጠናቋል!"
    );

    await render();
}
async function loadMentorAttendanceStudents(classId) {

    state.mentorAttendanceStudents = [];

    if (!supabaseClient || !classId) {
        return [];
    }

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("enrollments")
                .select(`
                    student_id,
                    status,
                    joined_at,
                    profiles (
                        id,
                        full_name,
                        student_id,
                        phone,
                        role
                    ),
                    classes (
                        id,
                        name,
                        level
                    )
                `)
                .eq("class_id", classId)
                .eq("status", "active")
                .order("joined_at", {
                    ascending: true
                });

        if (error) {

            console.warn(
                "⚠️ Mentor student lookup failed:",
                error.message
            );

            return [];

        }

        state.mentorAttendanceStudents =
            (data || []).filter(
                student =>
                    student.profiles &&
                    student.profiles.role === "student"
            );

        return state.mentorAttendanceStudents;

    } catch (error) {

        console.warn(
            "⚠️ Mentor students request failed:",
            error
        );

        return [];

    }

}
/* =========================================================
   LOAD MENTOR STUDENT LESSON PROGRESS
========================================================= */

async function loadMentorStudentProgress(classId) {
    state.mentorStudentProgress = {};

    if (!supabaseClient || !classId) {
        return {};
    }

    try {
        // Get the published lessons for this class.
        const {
            data: lessons,
            error: lessonsError
        } = await supabaseClient
            .from("lessons")
            .select(`
                id,
                published
            `)
            .eq("class_id", classId)
            .eq("published", true);

        if (lessonsError) {
            console.error(
                "❌ Failed to load mentor lesson list:",
                lessonsError
            );
            return {};
        }

        const totalLessons = (lessons || []).length;

        // Get the students in this class.
        const students =
            state.mentorAttendanceStudents || [];

        if (!students.length) {
            return {};
        }

        const studentIds =
            students.map(
                student => student.student_id
            );

        // Get all progress rows for this class.
        const {
            data: progressRows,
            error: progressError
        } = await supabaseClient
            .from("lesson_progress")
            .select(`
                student_id,
                lesson_id,
                completed,
                completed_at
            `)
            .eq("class_id", classId)
            .in("student_id", studentIds);

        if (progressError) {
            console.error(
                "❌ Failed to load mentor student progress:",
                progressError
            );
            return {};
        }

        const progressMap = {};

        studentIds.forEach(
            studentId => {
                progressMap[studentId] = {
                    completed: 0,
                    total: totalLessons,
                    percent: 0,
                    last_completed_at: null
                };
            }
        );

        (progressRows || []).forEach(
            row => {
                if (!row.completed) {
                    return;
                }

                const progress =
                    progressMap[row.student_id];

                if (!progress) {
                    return;
                }

                progress.completed += 1;

                if (
                    row.completed_at &&
                    (
                        !progress.last_completed_at ||
                        new Date(row.completed_at) >
                        new Date(progress.last_completed_at)
                    )
                ) {
                    progress.last_completed_at =
                        row.completed_at;
                }
            }
        );

        Object.values(progressMap).forEach(
            progress => {
                progress.percent =
                    progress.total > 0
                        ? Math.round(
                            (
                                progress.completed /
                                progress.total
                            ) * 100
                        )
                        : 0;
            }
        );

        state.mentorStudentProgress =
            progressMap;

        console.log(
            "✅ Mentor student progress loaded:",
            progressMap
        );

        return progressMap;

    } catch (error) {
        console.error(
            "❌ Mentor student progress error:",
            error
        );

        return {};
    }
}

/* =========================================================
   LOAD EXISTING ATTENDANCE FOR DATE
========================================================= */

async function loadMentorAttendanceForDate(
    classId,
    date
) {

    state.mentorAttendanceStatuses =
        {};


    if (
        !supabaseClient ||
        !classId ||
        !date
    ) {

        return {};

    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("attendance")
                .select(
                    "student_id, status, note"
                )
                .eq(
                    "class_id",
                    classId
                )
                .eq(
                    "attendance_date",
                    date
                );


        if (error) {

            console.warn(
                "⚠️ Existing attendance lookup failed:",
                error.message
            );

            return {};

        }


        (data || [])
            .forEach(
                record => {

                    state.mentorAttendanceStatuses[
                        record.student_id
                    ] = {

                        status:
                            record.status,

                        note:
                            record.note || ""

                    };

                }
            );


        return state.mentorAttendanceStatuses;

    } catch (error) {

        console.warn(
            "⚠️ Existing attendance request failed:",
            error
        );

        return {};

    }

}


/* =========================================================
   LOAD ROLE DATA
========================================================= */

async function loadRoleData() {

    const user =
        window.currentUser;


    if (!user) {

        return;

    }


    if (
        state.role === "student"
    ) {

        await loadStudentClass(
            user.id
        );

        await loadStudentAttendance(
            user.id
        );

        return;

    }


    await loadMentorClasses(
        user.id
    );

}


/* =========================================================
   INITIAL AUTH
========================================================= */

async function initializeAuth() {

    if (!supabaseClient) {
        console.error("❌ Supabase unavailable");
        await showLoginPage();
        return;
    }

    /*
       🔒 PRIVACY MODE

       A sessionStorage flag exists only while this tab/app
       session is active.

       If the page was refreshed or reopened without the flag,
       the Supabase session is destroyed and the login page
       is shown.
    */

    const appSession =
        sessionStorage.getItem(
            "begena_authenticated"
        );

    if (!appSession) {

        console.log(
            "🔒 No active app session. Logging out."
        );

        window.currentUser = null;
        window.currentProfile = null;

        state.currentClass = null;
        state.studentAttendance = [];
        state.mentorClasses = [];

        try {
            await supabaseClient.auth.signOut();
        } catch (error) {
            console.error(
                "❌ Privacy logout failed:",
                error
            );
        }

        await showLoginPage();
        return;
    }

    try {

        const {
            data: userData,
            error
        } = await supabaseClient.auth.getUser();

        if (error) {

            console.error(
                "❌ User verification failed:",
                error
            );

            sessionStorage.removeItem(
                "begena_authenticated"
            );

            await showLoginPage();
            return;
        }

        const user =
            userData?.user;

        if (!user) {

            console.log(
                "ℹ️ No authenticated user"
            );

            sessionStorage.removeItem(
                "begena_authenticated"
            );

            await showLoginPage();
            return;
        }

        /* =========================================
           AUTH USER
        ========================================= */

        window.currentUser = user;

sessionStorage.setItem(
    "begena_authenticated",
    "true"
);

        console.log(
            "🔥 LOGGED USER:",
            user.id,
            user.email
        );

        /* =========================================
           LOAD REAL PROFILE
        ========================================= */

        const profile =
            await loadUserProfile(user.id);

        if (!profile) {

            console.error(
                "❌ No profile found for:",
                user.id
            );

            sessionStorage.removeItem(
                "begena_authenticated"
            );

            await supabaseClient.auth.signOut();
            await showLoginPage();
            return;
        }

        console.log(
            "🔥 PROFILE ROLE:",
            profile.role
        );

        /* =========================================
           APPLY REAL ROLE
        ========================================= */

        const applied =
            applyUserProfile(profile);

        if (!applied) {

            console.error(
                "❌ Failed to apply profile"
            );

            sessionStorage.removeItem(
                "begena_authenticated"
            );

            await supabaseClient.auth.signOut();
            await showLoginPage();
            return;
        }

        console.log(
            "🔥 AUTH STATE:",
            {
                userId:
                    window.currentUser?.id,

                profileId:
                    window.currentProfile?.id,

                role:
                    state.role,

                page:
                    state.page
            }
        );

        /* =========================================
           LOAD ROLE DATA
        ========================================= */

        await loadRoleData();

        console.log(
            "🔥 ROLE DATA COMPLETE:",
            {
                role:
                    state.role,

                page:
                    state.page,

                currentClass:
                    state.currentClass?.id
            }
        );

        /* =========================================
           SHOW APP
        ========================================= */

        await showApp();

        /* =========================================
           FINAL RENDER
        ========================================= */

        await render();

        console.log(
            "🔥 FINAL APP STATE:",
            {
                userId:
                    window.currentUser?.id,

                profileId:
                    window.currentProfile?.id,

                role:
                    state.role,

                page:
                    state.page
            }
        );

    } catch (error) {

        console.error(
            "❌ Auth initialization failed:",
            error
        );

        window.currentUser = null;
        window.currentProfile = null;

        sessionStorage.removeItem(
            "begena_authenticated"
        );

        await showLoginPage();
    }
}


/* =========================================================
   STUDENT ID LOGIN
========================================================= */

function setupLogin() {

    const loginForm =
        get("login-form");


    if (!loginForm) {

        console.warn(
            "⚠️ #login-form not found"
        );

        return;

    }


    loginForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const studentId =
                get("login-student-id")
                    ?.value
                    .trim()
                    .toLowerCase();
console.log("🟡 LOGIN ID ENTERED:", studentId);

            const password =
                get("login-password")
                    ?.value;


            const errorElement =
                get("login-error");


            if (errorElement) {

                errorElement.textContent =
                    "";

            }


            if (
                !studentId ||
                !password
            ) {

                if (errorElement) {

                    errorElement.textContent =
                        "Please enter your Student ID and password.";

                }

                return;

            }


const submitButton =
    loginForm.querySelector(
        'button[type="submit"]'
    );


if (
    !navigator.onLine ||
    !supabaseClient
) {

    if (submitButton) {

        submitButton.disabled =
            true;

        submitButton.textContent =
            "Checking offline...";

    }

    try {

        await loginOfflineStudent(
            studentId,
            password,
            errorElement
        );

    } finally {

        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                "Sign In";

        }

    }

    return;

}


            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.textContent =
                    "Signing in...";

            }


            try {

                const {
                    data: lookupData,
                    error: lookupError
                } =
                    await supabaseClient.functions.invoke(
                        "user-id-login",
                        {
                            body: {
                                student_id:
                                    studentId
                            }
                        }
                    );
console.log("🟠 LOGIN LOOKUP RESULT:", lookupData);

                if (
    lookupError ||
    !lookupData?.email
) {

    console.warn(
        "⚠️ Supabase lookup failed. Trying offline login...",
        lookupError
    );

    const offlineLoggedIn =
        await loginOfflineStudent(
            studentId,
            password,
            errorElement
        );

    if (offlineLoggedIn) {
        return;
    }

    console.error(
        "❌ Student ID lookup failed:",
        lookupError
    );

    if (errorElement) {

        errorElement.textContent =
            lookupData?.error ||
            "Invalid Student ID or password.";

    }

    return;
}


                const {
                    data,
                    error
                } =
                    await supabaseClient.auth
                        .signInWithPassword({

                            email:
                                lookupData.email,

                            password

                        });
                        console.log(
    "🟢 SUPABASE SIGNED IN USER:",
    data?.user?.id,
    data?.user?.email
);


                if (error) {

                    console.error(
                        "❌ Login failed:",
                        error
                    );


                    if (errorElement) {

                        errorElement.textContent =
                            "Invalid Student ID or password.";

                    }

                    return;

                }


                const user =
                    data?.user;


                if (!user) {

                    if (errorElement) {

                        errorElement.textContent =
                            "Login failed.";

                    }

                    return;

                }


                window.currentUser =
                    user;


                const profile =
                    await loadUserProfile(
                        user.id
                    );


                if (!profile) {

                    if (errorElement) {

                        errorElement.textContent =
                            "Your account profile could not be loaded.";

                    }

                    await supabaseClient.auth.signOut();

                    return;

                }


                if (
                    !applyUserProfile(
                        profile
                    )
                ) {

                    if (errorElement) {

                        errorElement.textContent =
                            "Your account has an invalid role.";

                    }

                    await supabaseClient.auth.signOut();

                    return;

                }


                await loadRoleData();
await showApp();

await loadRoleData();

await saveOfflineStudentCredentials(
    studentId,
    password,
    user,
    profile
);
if (
    profile.role === "student"
) {

    try {

        await cacheStudentOfflineContent();

    } catch (error) {

        console.warn(
            "⚠️ Offline content cache warm-up failed:",
            error
        );

    }

}

await showApp();

await render();


                showToast(
                    `✅ እንኳን ደህና መጣህ ${
                        profile.full_name || ""
                    }`
                );


            } catch (error) {

                console.error(
                    "❌ Student ID login failed:",
                    error
                );


                if (errorElement) {

                    errorElement.textContent =
                        "Something went wrong. Please try again.";

                }

            } finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        "Sign In";

                }

            }

        }
    );

}


/* =========================================================
   AUTH LISTENER
========================================================= */

function setupAuthListener() {

    if (!supabaseClient) {

        return;

    }


    supabaseClient.auth.onAuthStateChange(
        async (
            event,
            session
        ) => {

            console.log(
                "🔐 Auth event:",
                event
            );


            if (!session) {

                window.currentUser =
                    null;

                window.currentProfile =
                    null;

                state.currentClass =
                    null;

                state.studentAttendance =
                    [];

                state.mentorClasses =
                    [];

                await showLoginPage();

            }

        }
    );

}


/* =========================================================
   NAVIGATION
========================================================= */

const studentNavigation = [

    {
        id: "home",
        icon: "🏠",
        am: "መነሻ",
        en: "Home"
    },

    {
        id: "begena",
        icon: "🎻",
        am: "በገና",
        en: "Begena"
    },

    {
        id: "tuner",
        icon: "🎼",
        am: "መቃኛ",
        en: "Mekagna"
    },

    {
        id: "mezmur",
        icon: "🎵",
        am: "መዝሙር ግጥም",
        en: "Mezmur"
    },

    {
        id: "tutor",
        icon: "🎓",
        am: "በገና ትምህርት",
        en: "Tutor"
    },
    {
    id: "leaderboard",
    icon: "🏆",
    am: "የደረጃ ሰንጠረዥ",
    en: "Leaderboard"
    },
    {
        id: "attendance",
        icon: "✅",
        am: "ክትትል",
        en: "Attendance"
    },

    {
    id: "assignments",
    icon: "📝",
    am: "ስራዎች",
    en: "Assignments"
},

{
    id: "announcements",
    icon: "📢",
    am: "ማስታወቂያ",
    en: "Announcements"
},

{
    id: "certificates",
    icon: "🏆",
    am: "ምስክር ወረቀት",
    en: "Certificates"
},

    {
        id: "account",
        icon: "🔐",
        am: "መለያ እና ደህንነት",
        en: "Account & Security"
    }
];


const mentorNavigation = [

    {
        id: "dashboard",
        icon: "📊",
        am: "ዳሽቦርድ",
        en: "Dashboard"
    },

    {
        id: "classes",
        icon: "🏫",
        am: "ክፍል",
        en: "Class"
    },

    {
        id: "students",
        icon: "👥",
        am: "ተማሪዎች",
        en: "Students"
    },
    {
    id: "leaderboard",
    icon: "🏆",
    am: "የደረጃ ሰንጠረዥ",
    en: "Leaderboard"
    },
    {
        id: "attendance",
        icon: "✅",
        am: "ክትትል",
        en: "Attendance"
    },
    {
    id: "mezmur",
    icon: "🎵",
    am: "መዝሙር",
    en: "Mezmur"
},
    {
        id: "assignments",
        icon: "📝",
        am: "ስራዎች",
        en: "Assignments"
    },

    {
        id: "announcements",
        icon: "📢",
        am: "ማስታወቂያ",
        en: "Announcements"
    },

    {
        id: "lessons",
        icon: "📚",
        am: "ትምህርቶች",
        en: "Lessons"
    },

    {
        id: "certificates",
        icon: "🏆",
        am: "ምስክር ወረቀት",
        en: "Certificates"
    },

    {
        id: "account",
        icon: "🔐",
        am: "መለያ እና ደህንነት",
        en: "Account & Security"
    }
];


function getNavigation() {

    return state.role === "student"
        ? studentNavigation
        : mentorNavigation;

}


/* =========================================================
   NAVIGATION RENDER
========================================================= */

function renderNavigation() {

    const navigation =
        getNavigation();

    const html =
        navigation
            .map(
                item => {

                    const label =
                        state.language === "am"
                            ? item.am
                            : item.en;

                    return `

                        <button
                            type="button"
                            class="nav-item ${
                                state.page === item.id
                                    ? "active"
                                    : ""
                            }"
                            data-page="${item.id}"
                        >

                            <span>
                                ${item.icon}
                            </span>

                            <span>
                                ${escapeHtml(
                                    label
                                )}
                            </span>

                        </button>

                    `;

                }
            )
            .join("");

    const desktop =
        get("desktop-nav");

    const mobile =
        get("mobile-nav");

    if (desktop) {
        desktop.innerHTML =
            html;
    }

    if (mobile) {
        mobile.innerHTML =
            html;
    }

    document
        .querySelectorAll(".nav-item")
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    state.page =
                        button.dataset.page;

                    closeDrawer();

                    if (
                        state.page === "attendance" &&
                        state.role === "student" &&
                        window.currentUser
                    ) {

                        await loadStudentAttendance(
                            window.currentUser.id
                        );

                    }

                    render();

                }
            );

        });

}



/* =========================================================
   TITLE
========================================================= */

function renderTitle() {

    const current =
        getNavigation()
            .find(
                item =>
                    item.id === state.page
            );


    if (!current) {

        return;

    }


    const title =
        get("page-title");


    if (title) {

        title.textContent =
            state.language === "am"
                ? current.am
                : current.en;

    }

}


/* =========================================================
   DRAWER
========================================================= */

function openDrawer() {

    const drawer =
        get("mobile-drawer");


    const overlay =
        get("drawer-overlay");


    if (
        !drawer ||
        !overlay
    ) {

        return;

    }


    drawer.classList.add(
        "open"
    );


    overlay.classList.add(
        "open"
    );


    drawer.setAttribute(
        "aria-hidden",
        "false"
    );

}


function closeDrawer() {

    const drawer =
        get("mobile-drawer");


    const overlay =
        get("drawer-overlay");


    if (drawer) {

        drawer.classList.remove(
            "open"
        );


        drawer.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    if (overlay) {

        overlay.classList.remove(
            "open"
        );

    }

}


/* =========================================================
   TOAST
========================================================= */

function showToast(message) {

    const toast =
        get("toast");


    if (!toast) {

        return;

    }


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );

        },
        2500
    );

}


/* =========================================================
   STUDENT HOME
========================================================= */

function studentHome() {

    const profile =
        window.currentProfile || {};


    const name =
        escapeHtml(
            profile.full_name ||
            "Student"
        );


    const studentId =
        escapeHtml(
            profile.student_id ||
            "Not assigned yet"
        );


    const phone =
        escapeHtml(
            profile.phone ||
            "Not added"
        );


    const language =
        profile.preferred_language === "en"
            ? "English"
            : profile.preferred_language === "am"
                ? "አማርኛ"
                : "Not set";


    const initial =
        escapeHtml(
            (
                profile.full_name ||
                "Student"
            )
                .trim()
                .charAt(0)
                .toUpperCase()
        );


    const attendanceStats =
        calculateAttendanceStats(
            state.studentAttendance
        );


    const attendanceDisplay =
        attendanceStats.total > 0
            ? `${attendanceStats.percentage}%`
            : "—";


    const currentClass =
        state.currentClass;


    const classContent =
        currentClass

            ? `

                <div class="big gold">
                    ${escapeHtml(
                        currentClass.name
                    )}
                </div>

                <div class="muted">
    🎓 የእኔ ክፍል
</div>

            `

            : `

                <div class="big">
                    በቅርቡ
                </div>

                <div class="muted">
                    እስካሁን ወደ ክፍል
                    አልተመደብክም።
                </div>

            `;


    return `

        <div class="hero">

            <div class="pill gold">
                ● የእኔ መለያ
            </div>

            <h2>
                እንኳን ደህና መጣህ,
                ${name} 👋
            </h2>

            <p>
                ይህ የእርስዎ የበገና
                ትምህርት መድረክ ነው።
                ትምህርትዎን፣ ልምምድዎን
                እና እድገትዎን ከዚህ
                ማስተዳደር ይችላሉ።
            </p>

            <div class="row">

                <button
                    type="button"
                    class="btn primary"
                    data-go="tutor"
                >
                    🎓 ትምህርት ጀምር
                </button>

                <button
                    type="button"
                    class="btn secondary"
                    data-go="begena"
                >
                    🎻 በገና ሞክር
                </button>

            </div>

        </div>


        <div
            class="grid two"
            style="margin-top:16px"
        >

            <div class="card">

                <div class="row">

                    <div
                        class="profile-circle"
                        style="
                            width:58px;
                            height:58px;
                            flex:0 0 58px;
                            border-radius:18px;
                            font-size:20px;
                        "
                    >
                        ${initial || "S"}
                    </div>

                    <div>

                        <div class="muted">
                            የእኔ መገለጫ
                        </div>

                        <div
                            class="big"
                            style="font-size:22px;"
                        >
                            ${name}
                        </div>

                    </div>

                </div>

            </div>


            <div class="card">

                <div class="muted">
                    🏫 የእኔ ክፍል
                </div>

                ${classContent}

            </div>

        </div>


        <div
            class="grid three"
            style="margin-top:16px"
        >

            <div class="card">

                <div class="muted">
                    🪪 Student ID
                </div>

                <div
                    class="big"
                    style="font-size:20px;"
                >
                    ${studentId}
                </div>

            </div>


            <div class="card">

                <div class="muted">
                    ✅ ክትትል
                </div>

                <div
                    class="big gold"
                    style="font-size:20px;"
                >
                    ${attendanceDisplay}
                </div>

                <div class="muted">
                    ${
                        attendanceStats.total > 0
                            ? `${attendanceStats.total} records`
                            : "No records yet"
                    }
                </div>

            </div>


            <div class="card">

                <div class="muted">
                    🌐 ቋንቋ
                </div>

                <div
                    class="big"
                    style="font-size:20px;"
                >
                    ${language}
                </div>

            </div>

        </div>


        <div
            class="grid two"
            style="margin-top:16px"
        >

            <div class="card">

                <h3>
                    📢 ማስታወቂያ
                </h3>

                <div class="list">

                    <div class="list-item">

                        <b>
                            ማስታወቂያዎች በቅርቡ
                        </b>

                        <div class="muted">
                            ከአስተማሪዎች እና
                            አስተዳዳሪዎች
                            የሚመጡ ማስታወቂያዎች
                            እዚህ ይታያሉ።
                        </div>

                    </div>

                </div>

            </div>


            <div class="card">

                <h3>
                    🎯 የእኔ እድገት
                </h3>

                <div class="big gold">
                    ${
                        attendanceStats.total > 0
                            ? `${attendanceStats.percentage}%`
                            : "በቅርቡ"
                    }
                </div>

                <div class="meter">

                    <div
                        style="
                            width:${
                                attendanceStats.total > 0
                                    ? attendanceStats.percentage
                                    : 0
                            }%;
                        "
                    ></div>

                </div>

            </div>

        </div>

    `;

}


/* =========================================================
   ACCOUNT & SECURITY
========================================================= */

function accountPage() {

    const profile = window.currentProfile || {};
    const name = escapeHtml(profile.full_name || "User");
    const studentId = escapeHtml(profile.student_id || "");
    const initial = escapeHtml(
        (profile.full_name || "U").trim().charAt(0).toUpperCase() || "U"
    );

    return `
        <div class="hero">
            <div class="pill gold">
                🔐 ${state.language === "am" ? "የመለያ ደህንነት" : "ACCOUNT SECURITY"}
            </div>
            <h2>
                ${state.language === "am" ? "የይለፍ ቃልዎን ይቀይሩ" : "Change your password"}
            </h2>
            <p>
                ${state.language === "am"
                    ? "የተሰጠዎትን ጊዜያዊ የይለፍ ቃል በራስዎ የሚያስታውሱት ደህንነታማ የይለፍ ቃል ይተኩ።"
                    : "Replace your temporary password with a private password that only you know."}
            </p>
        </div>

        <div class="card account-security-card" style="margin-top:16px; max-width:720px;">
            <div class="row" style="align-items:flex-start; margin-bottom:18px;">
                <div class="profile-circle" style="display:flex; width:58px; height:58px; flex:0 0 58px; border-radius:18px; font-size:20px;">
                    ${initial}
                </div>
                <div>
                    <div class="big" style="font-size:20px;">${name}</div>
                    ${studentId ? `<div class="muted">${studentId}</div>` : ""}
                </div>
            </div>

            <div id="change-password-message" class="account-message" style="display:none;"></div>

            <form id="change-password-form" class="account-password-form">
                <label for="current-password">
                    ${state.language === "am" ? "የአሁኑ የይለፍ ቃል" : "Current password"}
                </label>
                <input id="current-password" type="password" autocomplete="current-password" minlength="6" required>

                <label for="new-password">
                    ${state.language === "am" ? "አዲስ የይለፍ ቃል" : "New password"}
                </label>
                <input id="new-password" type="password" autocomplete="new-password" minlength="8" required>

                <label for="confirm-new-password">
                    ${state.language === "am" ? "አዲሱን የይለፍ ቃል ያረጋግጡ" : "Confirm new password"}
                </label>
                <input id="confirm-new-password" type="password" autocomplete="new-password" minlength="8" required>

                <div class="muted password-hint">
                    ${state.language === "am"
                        ? "ቢያንስ 8 ቁምፊ ያለው ጠንካራ የይለፍ ቃል ይጠቀሙ።"
                        : "Use a strong password with at least 8 characters."}
                </div>

                <div class="row" style="justify-content:flex-end; margin-top:8px;">
                    <button type="submit" class="btn primary" id="change-password-button">
                        🔐 ${state.language === "am" ? "የይለፍ ቃል ቀይር" : "Change Password"}
                    </button>
                </div>
            </form>
        </div>
    `;
}


async function changeAccountPassword(event) {

    event.preventDefault();

    const button = get("change-password-button");
    const message = get("change-password-message");
    const currentPassword = get("current-password")?.value || "";
    const newPassword = get("new-password")?.value || "";
    const confirmPassword = get("confirm-new-password")?.value || "";

    const setMessage = (text, isError = true) => {
        if (!message) return;
        message.textContent = text;
        message.style.display = "block";
        message.classList.toggle("success", !isError);
    };

    if (!supabaseClient || !window.currentUser) {
        setMessage("❌ You are not authenticated.");
        return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
        setMessage("⚠️ Please fill in all password fields.");
        return;
    }

    if (newPassword.length < 8) {
        setMessage("⚠️ New password must be at least 8 characters.");
        return;
    }

    if (newPassword !== confirmPassword) {
        setMessage("⚠️ The new passwords do not match.");
        return;
    }

    if (currentPassword === newPassword) {
        setMessage("⚠️ Your new password must be different from the current password.");
        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = "Changing...";
    }

    try {
        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword,
            current_password: currentPassword
        });

        if (error) throw error;
        if (
    window.currentProfile?.role === "student" &&
    window.currentUser &&
    window.currentProfile?.student_id
) {

    await saveOfflineStudentCredentials(
        window.currentProfile.student_id,
        newPassword,
        window.currentUser,
        window.currentProfile
    );

}

        const form = get("change-password-form");
        if (form) form.reset();

        setMessage("✅ Password changed successfully! Your new password is now active.", false);
        showToast("✅ Password changed successfully.");

    } catch (error) {
        console.error("❌ Password change failed:", error);
        setMessage("❌ " + (error?.message || "Password change failed. Check your current password and try again."));
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = state.language === "am"
                ? "🔐 የይለፍ ቃል ቀይር"
                : "🔐 Change Password";
        }
    }
}


/* =========================================================
   MENTOR DASHBOARD
========================================================= */

function mentorDashboard() {

    const profile =
        window.currentProfile || {};


    const name =
        escapeHtml(
            profile.full_name ||
            (
                profile.role === "admin"
                    ? "Admin"
                    : "Mentor"
            )
        );


    const roleLabel =
        profile.role === "admin"
            ? "ADMIN MODE"
            : "MENTOR MODE";


    const classCount =
        state.mentorClasses.length;


    return `

        <div class="hero">

            <div class="pill gold">
                ${roleLabel}
            </div>

            <h2>
                እንኳን ደህና መጡ,
                ${name}
            </h2>

            <p>
                የበገና ትምህርትን፣
                ክፍልን እና
                ክትትልን
                ከአንድ ቦታ ያስተዳድሩ።
            </p>

        </div>


        <div
            class="grid stats"
            style="margin-top:16px"
        >

            <div class="card">

                <div class="muted">
                    የእኔ ክፍሎች
                </div>

                <div class="big">
                    ${classCount}
                </div>

            </div>


            <div class="card">

                <div class="muted">
                    ተማሪዎች
                </div>

                <div class="big">
                    በቅርቡ
                </div>

            </div>


            <div class="card">

                <div class="muted">
                    የሚጠበቁ ስራዎች
                </div>

                <div class="big">
                    በቅርቡ
                </div>

            </div>


            <div class="card">

                <div class="muted">
                    ምስክር ወረቀት
                </div>

                <div class="big gold">
                    በቅርቡ
                </div>

            </div>

        </div>


        <div
            class="grid two"
            style="margin-top:16px"
        >

            <div class="card">

                <h3>
                    🏫 የእኔ ክፍል
                </h3>

                <div class="list">

                    ${
                        state.mentorClasses.length

                            ? state.mentorClasses
                                .map(
                                    classroom => `

                                        <div class="list-item">

                                            <b>
                                                ${escapeHtml(
                                                    classroom.name
                                                )}
                                            </b>

                                            <div class="muted">
                                                Level ${
                                                    Number.isFinite(
                                                        classroom.level
                                                    )
                                                        ? classroom.level
                                                        : "—"
                                                }
                                            </div>

                                        </div>

                                    `
                                )
                                .join("")

                            : `

                                <div class="list-item">

                                    <b>
                                        እስካሁን ክፍል አልተመደበም
                                    </b>

                                    <div class="muted">
                                        አስተዳዳሪው
                                        ሲመድብህ
                                        እዚህ ይታያል።
                                    </div>

                                </div>

                            `
                    }

                </div>

            </div>


            <div class="card">

                <h3>
                    ⚡ ፈጣን እርምጃ
                </h3>

                <div class="list">

                    <button
                        type="button"
                        class="btn secondary"
                        data-go="attendance"
                    >
                        ✅ ክትትል
                    </button>

                    <button
                        type="button"
                        class="btn secondary"
                        data-go="assignments"
                    >
                        📝 ስራ
                    </button>

                    <button
                        type="button"
                        class="btn secondary"
                        data-go="announcements"
                    >
                        📢 ማስታወቂያ
                    </button>

                </div>

            </div>

        </div>

    `;

}


/* =========================================================
   MENTOR CLASS PAGE
========================================================= */

function mentorClassesPage() {

    return `

        <div class="card">

            <h3>
                🏫 የበገና ክፍል
            </h3>

            <div class="muted">
                የአስተማሪው የተመደበ
                ክፍል
            </div>


            <div
                class="list"
                style="margin-top:16px;"
            >

                ${
                    state.mentorClasses.length

                        ? state.mentorClasses
                            .map(
                                classroom => `

                                    <div class="list-item">

                                        <b>
                                            ${escapeHtml(
                                                classroom.name
                                            )}
                                        </b>

                                        <div class="muted">
                                            Level ${
                                                Number.isFinite(
                                                    classroom.level
                                                )
                                                    ? classroom.level
                                                    : "—"
                                            }
                                        </div>

                                        ${
                                            classroom.description
                                                ? `
                                                    <div
                                                        class="muted"
                                                        style="margin-top:7px;"
                                                    >
                                                        ${escapeHtml(
                                                            classroom.description
                                                        )}
                                                    </div>
                                                `
                                                : ""
                                        }

                                    </div>

                                `
                            )
                            .join("")

                        : `

                            <div class="list-item">

                                <b>
                                    ክፍል አልተመደበም
                                </b>

                                <div class="muted">
                                    አስተዳዳሪው
                                    እስኪያስመድብ
                                    ድረስ ምንም
                                    የክፍል እርምጃ
                                    አይኖርም።
                                </div>

                            </div>

                        `
                }

            </div>

        </div>

    `;

}


/* =========================================================
   STUDENT ATTENDANCE PAGE
========================================================= */

function attendancePage() {

    const stats =
        calculateAttendanceStats(
            state.studentAttendance
        );


    const percentage =
        stats.total > 0
            ? `${stats.percentage}%`
            : "—";


    const recent =
        state.studentAttendance
            .slice(
                0,
                8
            );


    return `

        <div class="grid three">

            <div class="card">

                <div class="muted">
                    ጠቅላላ ቀናት
                </div>

                <div class="big">
                    ${stats.total}
                </div>

            </div>


            <div class="card">

                <div class="muted">
                    ✅ Present
                </div>

                <div
                    class="big gold"
                >
                    ${stats.present}
                </div>

            </div>


            <div class="card">

                <div class="muted">
                    📊 Attendance
                </div>

                <div
                    class="big gold"
                >
                    ${percentage}
                </div>

            </div>

        </div>


        <div
            class="grid two"
            style="margin-top:16px;"
        >

            <div class="card">

                <h3>
                    📈 የእኔ ክትትል
                </h3>


                <div
                    class="big gold"
                    style="font-size:42px;"
                >
                    ${percentage}
                </div>


                <div class="meter">

                    <div
                        style="
                            width:${
                                stats.total > 0
                                    ? stats.percentage
                                    : 0
                            }%;
                        "
                    ></div>

                </div>


                <div
                    class="muted"
                    style="
                        margin-top:10px;
                    "
                >
                    Present: ${stats.present}
                    <br>
                    Late: ${stats.late}
                    <br>
                    Absent: ${stats.absent}
                    <br>
                    Excused: ${stats.excused}
                </div>

            </div>


            <div class="card">

                <h3>
                    🗓️ የቅርብ ክትትል
                </h3>

                <div class="list">

                    ${
                        recent.length

                            ? recent
                                .map(
                                    record => `

                                        <div class="list-item">

                                            <div
                                                class="row space"
                                            >

                                                <div>

                                                    <b>
                                                        ${escapeHtml(
                                                            record.classes?.name ||
                                                            "Begena Class"
                                                        )}
                                                    </b>

                                                    <div class="muted">
                                                        ${formatDate(
                                                            record.attendance_date
                                                        )}
                                                    </div>

                                                </div>

                                                <span
                                                    class="pill ${
                                                        record.status === "present"
                                                            ? "gold"
                                                            : ""
                                                    }"
                                                >
                                                    ${escapeHtml(
                                                        record.status
                                                    )}
                                                </span>

                                            </div>

                                            ${
                                                record.note
                                                    ? `
                                                        <div
                                                            class="muted"
                                                            style="margin-top:7px;"
                                                        >
                                                            ${escapeHtml(
                                                                record.note
                                                            )}
                                                        </div>
                                                    `
                                                    : ""
                                            }

                                        </div>

                                    `
                                )
                                .join("")

                            : `

                                <div class="list-item">

                                    <b>
                                        ምንም የክትትል መረጃ የለም
                                    </b>

                                    <div class="muted">
                                        አስተማሪው
                                        ክትትል ሲመዘግብ
                                        እዚህ ይታያል።
                                    </div>

                                </div>

                            `
                    }

                </div>

            </div>

        </div>

    `;

}


/* =========================================================
   MENTOR ATTENDANCE PAGE
========================================================= */

async function mentorAttendancePage() {

    /*
        This page is loaded through renderPage().
        Data is prepared before the HTML is rendered
        by prepareMentorAttendance().
    */

    const classId =
        state.mentorClasses?.[0]?.id;


    if (!classId) {

        return `

            <div class="card">

                <h3>
                    ✅ የዛሬ ክትትል
                </h3>

                <div class="list">

                    <div class="list-item">

                        <b>
                            ክፍል አልተመደበም
                        </b>

                        <div class="muted">
                            አስተዳዳሪው
                            ለአስተማሪው
                            የበገና ክፍል
                            እስኪያስመድብ
                            ድረስ ክትትል
                            መመዝገብ አይቻልም።
                        </div>

                    </div>

                </div>

            </div>

        `;

    }


    const classroom =
        state.mentorClasses[0];


    return `

        <div class="card">

            <div class="row space">

                <div>

                    <h3>
                        ✅ የክትትል ማስመዝገቢያ
                    </h3>

                    <div class="muted">
    🎓 የተመደበ ክፍል
</div>

                </div>


                <div class="row">

                    <input
                        id="attendance-date"
                        type="date"
                        value="${state.attendanceDate}"
                        style="
                            width:auto;
                            min-width:150px;
                        "
                    >

                    <button
                        type="button"
                        class="btn primary"
                        id="save-attendance"
                    >
                        💾 አስቀምጥ
                    </button>

                </div>

            </div>


            <div
    class="row"
    style="
        margin-top:18px;
        gap:10px;
        flex-wrap:wrap;
    "
>

    <input
        id="teacher-attendance-search"
        type="search"
        placeholder="🔎 Search student..."
        style="
            flex:1;
            min-width:220px;
        "
    >

    <button
        type="button"
        class="btn primary"
        id="teacher-attendance-search-button"
    >
        🔎 Search
    </button>

</div>


<div
    class="list"
    id="teacher-attendance-list"
    style="margin-top:14px;"
>

                ${
                    state.mentorAttendanceStudents.length

                        ? state.mentorAttendanceStudents
                            .map(
                                student => {

                                    const profile =
                                        student.profiles ||
                                        {};

                                    const existing =
                                        state.mentorAttendanceStatuses[
                                            student.student_id
                                        ];

                                    const currentStatus =
                                        existing?.status ||
                                        "present";


                                    return `

                                        <div
    class="list-item"
    data-search="${escapeHtml(
        [
            profile.full_name,
            profile.student_id
        ]
            .filter(Boolean)
            .join(" ")
    )}"
>

                                            <div
                                                class="row space"
                                            >

                                                <div>

                                                    <b>
                                                        ${escapeHtml(
                                                            profile.full_name ||
                                                            "Student"
                                                        )}
                                                    </b>

                                                    <div class="muted">

                                                        ${
                                                            profile.student_id
                                                                ? escapeHtml(
                                                                    profile.student_id
                                                                )
                                                                : "No Student ID"
                                                        }

                                                    </div>

                                                </div>


                                                <select
                                                    class="attendance-status"
                                                    data-student-id="${
                                                        student.student_id
                                                    }"
                                                >

                                                    <option
                                                        value="present"
                                                        ${
                                                            currentStatus === "present"
                                                                ? "selected"
                                                                : ""
                                                        }
                                                    >
                                                        ✅ Present
                                                    </option>

                                                    <option
                                                        value="late"
                                                        ${
                                                            currentStatus === "late"
                                                                ? "selected"
                                                                : ""
                                                        }
                                                    >
                                                        🟡 Late
                                                    </option>

                                                    <option
                                                        value="absent"
                                                        ${
                                                            currentStatus === "absent"
                                                                ? "selected"
                                                                : ""
                                                        }
                                                    >
                                                        ❌ Absent
                                                    </option>

                                                    <option
                                                        value="excused"
                                                        ${
                                                            currentStatus === "excused"
                                                                ? "selected"
                                                                : ""
                                                        }
                                                    >
                                                        🟢 Excused
                                                    </option>

                                                </select>

                                            </div>


                                            <input
                                                class="attendance-note"
                                                data-student-id="${
                                                    student.student_id
                                                }"
                                                value="${
                                                    escapeHtml(
                                                        existing?.note || ""
                                                    )
                                                }"
                                                placeholder="Optional note"
                                                style="
                                                    margin-top:10px;
                                                "
                                            >

                                        </div>

                                    `;

                                }
                            )
                            .join("")

                        : `

                            <div class="list-item">

                                <b>
                                    በዚህ ክፍል ውስጥ
                                    ተመዝጋቢ ተማሪ
                                    የለም።
                                </b>

                                <div class="muted">
                                    ተማሪዎች
                                    ወደ Begena Class
                                    ሲመዘገቡ
                                    እዚህ ይታያሉ።
                                </div>

                            </div>

                        `
                }

            </div>

        </div>

    `;

}


/* =========================================================
   PREPARE MENTOR ATTENDANCE
========================================================= */

async function prepareMentorAttendance() {

    const classId =
        state.mentorClasses?.[0]?.id;


    if (!classId) {

        state.mentorAttendanceStudents =
            [];

        state.mentorAttendanceStatuses =
            {};

        return;

    }


    await loadMentorAttendanceStudents(
        classId
    );


    await loadMentorAttendanceForDate(
        classId,
        state.attendanceDate
    );

}


/* =========================================================
   SAVE ATTENDANCE
========================================================= */

async function saveAttendance() {

    const classId =
        state.mentorClasses?.[0]?.id;


    if (!classId) {

        showToast(
            "❌ No class is assigned."
        );

        return;

    }


    const dateInput =
        get("attendance-date");


    const selectedDate =
        dateInput?.value ||
        state.attendanceDate;


    if (!selectedDate) {

        showToast(
            "⚠️ Choose an attendance date."
        );

        return;

    }


    state.attendanceDate =
        selectedDate;


    if (
        !supabaseClient ||
        !window.currentUser
    ) {

        showToast(
            "❌ You are not authenticated."
        );

        return;

    }


    if (
        !state.mentorAttendanceStudents.length
    ) {

        showToast(
            "⚠️ There are no enrolled students."
        );

        return;

    }


    const statusElements =
        document.querySelectorAll(
            ".attendance-status"
        );


    const noteElements =
        document.querySelectorAll(
            ".attendance-note"
        );


    const notesByStudent =
        {};


    noteElements.forEach(
        element => {

            notesByStudent[
                element.dataset.studentId
            ] =
                element.value.trim();

        }
    );


    const records =
        Array.from(
            statusElements
        )
            .map(
                select => ({

                    class_id:
                        classId,

                    student_id:
                        select.dataset.studentId,

                    attendance_date:
                        selectedDate,

                    status:
                        select.value,

                    marked_by:
                        window.currentUser.id,

                    note:
                        notesByStudent[
                            select.dataset.studentId
                        ] ||
                        null

                })
            );


    const button =
        get("save-attendance");


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Saving...";

    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from("attendance")
                .upsert(
                    records,
                    {
                        onConflict:
                            "class_id,student_id,attendance_date"
                    }
                );


        if (error) {

            console.error(
                "❌ Attendance save failed:",
                error
            );


            showToast(
                `❌ ${error.message}`
            );

            return;

        }


        showToast(
            "✅ Attendance saved successfully"
        );


        await loadMentorAttendanceForDate(
            classId,
            selectedDate
        );


        render();

    } catch (error) {

        console.error(
            "❌ Attendance save request failed:",
            error
        );


        showToast(
            "❌ Could not save attendance."
        );

    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "💾 አስቀምጥ";

        }

    }

}


/* =========================================================
   BEGENA
========================================================= */

function begenaPage() {

const mainBegenaStrings = [
    1,
    4,
    6,
    8,
    10
];


const strings =
    Array
        .from(
            {
                length: 10
            },
            (_, index) => {

                const number =
                    index + 1;

                const playable =
                    mainBegenaStrings.includes(
                        number
                    );


                return `

                    <div
                        class="
                            begena-string
                            ${
                                playable
                                    ? "playable-string"
                                    : "secondary-string"
                            }
                        "
                        data-string="${number}"
                        title="String ${number}"
                    >

                        <span>
                            ${number}
                        </span>

                    </div>

                `;

            }
        )
        .join("");


    return `

        <div class="grid two">

            <div class="card">

                <div class="row space">

                    <div>

                        <h3>
                            🎻 በገና ማሰልጠኛ
                        </h3>

                        <div class="muted">
                            10 ገመዶች
                        </div>

                    </div>


                    <div class="row">

    <select id="preset-select">

        <option>Selamta</option>
        <option>Tizita</option>
        <option>Sile Chernet</option>

    </select>

    <button
        type="button"
        class="btn secondary"
        id="begena-practice-button"
    >
        🎻 Practice Mode
    </button>

</div>

                </div>


                <div class="instrument">

                    <div class="begena-body">

                        <div class="begena-strings">
                            ${strings}
                        </div>

                    </div>

                </div>

            </div>


            <div class="card">

                <h3>
                    🎼 የበገና ሁኔታ
                </h3>


                <div class="list">

                    <div class="list-item">

                        <b>
                            Preset
                        </b>

                        <div
                            class="muted"
                            id="preset-name"
                        >
                            Selamta
                        </div>

                    </div>


                    <div class="list-item">

                        <b>
                            ገመድ
                        </b>

                        <div
                            class="muted"
                            id="string-name"
                        >
                            አልተመረጠም
                        </div>

                    </div>


                    <div class="list-item">

                        <span class="pill">
                            🎵 Practice Mode
                        </span>

                    </div>

                </div>

            </div>

        </div>

    `;

}


/* =========================================================
   MEKAGNA
========================================================= */

function tunerPage() {

    return `

        <div class="grid two">

            <div class="card">

                <h3>
                    🎼 መቃኛ — Mekagna
                </h3>

                <div class="muted">
                    Voice / Pitch Detector
                </div>

                <div
                    style="
                        width:220px;
                        height:220px;
                        margin:30px auto;
                        border-radius:50%;
                        display:grid;
                        place-items:center;
                        background:
                        conic-gradient(
                            #203f31 0 15%,
                            #d5ad51 15% 18%,
                            #203f31 18% 82%,
                            #d5ad51 82% 85%,
                            #203f31 85%
                        );
                    "
                >

                    <div style="text-align:center;">

                        <div
                            class="big"
                            id="detected-note"
                            style="font-size:44px;"
                        >
                            C#2
                        </div>

                        <div class="muted">
                            <span id="frequency">
                                69.30
                            </span>
                            Hz
                        </div>

                        <div class="gold">
                            <span id="cents">
                                +0
                            </span>
                            cents
                        </div>

                    </div>

                </div>

                <button
    type="button"
    class="btn primary"
    id="listen-button"
>
    🎙️ ማዳመጥ
</button>

            </div>


            <div class="card">

                <h3>
                    🎻 የበገና መቃኛ
                </h3>

                <div class="list">

                    <div class="list-item">

                        <b>
                            Preset
                        </b>

                        <div
                            class="muted"
                            id="tuner-preset"
                        >
                            Selamta
                        </div>

                    </div>


                    <div class="list-item">

                        <b>
                            Target
                        </b>

                        <div
                            class="big gold"
                            id="tuner-target-note"
                        >
                            C#2
                        </div>

                        <div
                            class="muted"
                            id="tuner-target-frequency"
                        >
                            69.30 Hz
                        </div>

                    </div>

                </div>

            </div>

        </div>

    `;

}


/* =========================================================
   MEZMUR
========================================================= */
const mezmurLibrary = [
    {
        id: "yibelahala",
        title: "ይበላሃላ",
        key: "4",
        lyrics: [
            "ይበላሃላ /4/",
            "አንተንም አፈር ይበላሃላ",
            "እንደሞኝ ሰው እንደተላላ",
            "አሊ ሲሞት ያለብኝ አሳር",
            "በአንድ እጄ ዶማ በአንድ እጄ ምሳር",
            "አሊ ሲሞት መብሌ ጉበት",
            "ከአሊ በፊት እኔ ልሙት",
            "አሊ ሲሞት መጠጤ አተላ",
            "አንተንም አፈር ይበላሃላ",
            "እኔንም ጎንደር ይሸጡኛላላ",
            "በላው አፈር በላው አፈር",
            "ያንን አንገት ያንን እግር",
            "አንቺንም አፈር ይበላሻላ",
            "እንደሞኝ ሰው እንደተላላ",
            "በላው አፈር በላው አፈር",
            "ያስተማረህን ያንን ምሁር",
            "በላው መረሬ በላው መረሬ",
            "ያንን የዋህ ሰው ያንን ገበሬ",
            "አንተንም አፈር ይበላሃላ",
            "እንደሞኝ ሰው እንደተላላ",
            "በላው አፈር በላው አፈር",
            "ያንን ታሪክ ያንን ዘመን",
            "ያንን ባህል ያንን ፍቅር",
            "ያንን አንድነት ያንን ህብረት",
            "በላው አፈር በላው አፈር",
            "አንተንም አፈር ይበላሃላ",
            "እንደሞኝ ሰው እንደተላላ"
        ],
        notation: [
            "42 45 42 22 /2/",
            "42 45 131 32",
            "3 1513 242 22"
        ],
        youtubeUrl: ""
    }
];

const activeMezmur = mezmurLibrary[0];
async function mezmurPage() {

    /*
     * =========================================================
     * LOAD SAVED MEZMUR
     * =========================================================
     */

    let mezmurs = [];

    const cachedMezmurs =
        typeof getOfflineContent === "function"
            ? getOfflineContent("mezmur", [])
            : [];


    /*
     * =========================================================
     * OFFLINE
     * =========================================================
     */

    if (!navigator.onLine) {

        mezmurs =
            Array.isArray(cachedMezmurs)
                ? cachedMezmurs
                : [];

    }


    /*
     * =========================================================
     * ONLINE
     * =========================================================
     */

    else {

        try {

            if (!supabaseClient) {

                mezmurs =
                    Array.isArray(cachedMezmurs)
                        ? cachedMezmurs
                        : [];

            } else {

                const {
                    data,
                    error
                } =
                    await supabaseClient
                        .from("mezmur")
                        .select(`
                            id,
                            title_am,
                            title_en,
                            lyrics_am,
                            meaning_en,
                            qenet,
                            level,
                            audio_path,
                            published,
                            created_at
                        `)
                        .eq("published", true)
                        .order(
                            "created_at",
                            {
                                ascending: false
                            }
                        );


                if (error) {

                    console.warn(
                        "⚠️ Student Mezmur loading failed. Using offline copy:",
                        error
                    );

                    mezmurs =
                        Array.isArray(cachedMezmurs)
                            ? cachedMezmurs
                            : [];

                } else {

                    mezmurs =
                        Array.isArray(data)
                            ? data
                            : [];


                    /*
                     * SAVE MEZMUR FOR OFFLINE
                     */

                    if (
                        typeof saveOfflineContent ===
                        "function"
                    ) {

                        saveOfflineContent(
                            "mezmur",
                            mezmurs
                        );

                    }

                }

            }

        } catch (error) {

            console.warn(
                "⚠️ Student Mezmur request failed. Using offline copy:",
                error
            );

            mezmurs =
                Array.isArray(cachedMezmurs)
                    ? cachedMezmurs
                    : [];

        }

    }


    /*
     * =========================================================
     * NO MEZMUR
     * =========================================================
     */

    if (!mezmurs.length) {

        return `
            <div class="page-stack">

                <div class="hero">

                    <h2>
                        🎵 መዝሙር
                    </h2>

                    <p>
                        የሚጠኑባቸው መዝሙሮች እዚህ ይታያሉ።
                    </p>

                </div>


                <div class="card empty-state">

                    <div style="font-size:40px;">
                        🎵
                    </div>

                    <h3>
                        ${
                            navigator.onLine
                                ? "ገና መዝሙር አልተጨመረም"
                                : "ከመስመር ውጭ የተቀመጠ መዝሙር የለም"
                        }
                    </h3>

                    <p class="muted">

                        ${
                            navigator.onLine
                                ? "አስተማሪዎ መዝሙር ሲጨምሩ እዚህ ይታያል።"
                                : "በመጀመሪያ ኢንተርኔት ላይ የመዝሙር ገጹን ይክፈቱ።"
                        }

                    </p>

                </div>

            </div>
        `;

    }


    /*
     * =========================================================
     * SELECTED MEZMUR
     * =========================================================
     */

    const selectedMezmur =
        mezmurs.find(
            mezmur =>
                mezmur.id ===
                state.selectedMezmurId
        ) ||
        mezmurs[0];


    /*
     * =========================================================
     * RENDER MEZMUR
     * =========================================================
     */

    return `
        <div class="page-stack">


            <!-- HEADER -->

            <div class="hero">

                <h2>
                    🎵 መዝሙር
                </h2>

                <p>
                    የተጨመሩ መዝሙሮችን ይማሩ።
                </p>

            </div>


            <!-- MEZMUR LIST -->

            <div class="card">

                <h3>
                    📚 የመዝሙር ዝርዝር
                </h3>

                <div
                    style="
                        display:grid;
                        gap:10px;
                        margin-top:14px;
                    "
                >

                    ${
                        mezmurs
                            .map(
                                mezmur => `
                                    <button
                                        type="button"
                                        class="btn ${
                                            mezmur.id ===
                                            selectedMezmur.id
                                                ? "primary"
                                                : ""
                                        }"
                                        data-mezmur-id="${mezmur.id}"
                                        style="
                                            text-align:left;
                                            width:100%;
                                        "
                                    >

                                        <div>

                                            <strong>

                                                ${escapeHtml(
                                                    mezmur.title_am ||
                                                    "ያልተሰየመ"
                                                )}

                                            </strong>


                                            ${
                                                mezmur.title_en
                                                    ? `
                                                        <div class="muted">

                                                            ${escapeHtml(
                                                                mezmur.title_en
                                                            )}

                                                        </div>
                                                    `
                                                    : ""
                                            }

                                        </div>

                                    </button>
                                `
                            )
                            .join("")
                    }

                </div>

            </div>


            <!-- SELECTED MEZMUR -->

            <div class="grid two">


                <!-- DETAILS -->

                <div class="card">

                    <div
                        class="row"
                        style="
                            justify-content:space-between;
                            align-items:flex-start;
                            gap:12px;
                        "
                    >

                        <div>

                            <span class="pill gold">
                                🎵 መዝሙር
                            </span>


                            <h2 style="margin-top:12px;">

                                ${escapeHtml(
                                    selectedMezmur.title_am ||
                                    "ያልተሰየመ"
                                )}

                            </h2>


                            ${
                                selectedMezmur.title_en
                                    ? `
                                        <div class="muted">

                                            ${escapeHtml(
                                                selectedMezmur.title_en
                                            )}

                                        </div>
                                    `
                                    : ""
                            }

                        </div>


                        <div>

                            ${
                                selectedMezmur.qenet
                                    ? `
                                        <span class="pill gold">

                                            🎼
                                            ${escapeHtml(
                                                selectedMezmur.qenet
                                            )}

                                        </span>
                                    `
                                    : ""
                            }


                            ${
                                selectedMezmur.level
                                    ? `
                                        <span class="pill">

                                            Level
                                            ${selectedMezmur.level}

                                        </span>
                                    `
                                    : ""
                            }

                        </div>

                    </div>


                    <hr
                        style="
                            border:0;
                            border-top:
                                1px solid var(--border);
                            margin:20px 0;
                        "
                    >


                    <h3>
                        🎼 የበገና ልምምድ
                    </h3>


                    <p class="muted">

                        ይህንን መዝሙር በበገና
                        ለመለማመድ ወደ ልምምድ ይሂዱ።

                    </p>


                    <div
                        class="row"
                        style="
                            margin-top:18px;
                            gap:10px;
                            flex-wrap:wrap;
                        "
                    >

                        <button
                            type="button"
                            class="btn primary"
                            id="practice-mezmur"
                        >

                            🎻 ለልምምድ ይሂዱ

                        </button>

                    </div>


                    ${
                        selectedMezmur.meaning_en
                            ? `
                                <div
                                    style="
                                        margin-top:24px;
                                        padding-top:18px;
                                        border-top:
                                            1px solid var(--border);
                                    "
                                >

                                    <h3>
                                        🇬🇧 English Meaning
                                    </h3>


                                    <div
                                        class="muted"
                                        style="
                                            margin-top:10px;
                                            line-height:1.8;
                                            white-space:pre-wrap;
                                        "
                                    >

                                        ${escapeHtml(
                                            selectedMezmur.meaning_en
                                        )}

                                    </div>

                                </div>
                            `
                            : ""
                    }

                </div>


                <!-- LYRICS -->

                <div class="card">

                    <h3>
                        📖 ግጥም
                    </h3>


                    ${
                        selectedMezmur.lyrics_am
                            ? `
                                <div
                                    style="
                                        margin-top:14px;
                                        font-size:19px;
                                        line-height:2.15;
                                        white-space:pre-wrap;
                                    "
                                >

                                    ${escapeHtml(
                                        selectedMezmur.lyrics_am
                                    )}

                                </div>
                            `
                            : `
                                <div
                                    class="empty-state"
                                    style="
                                        margin-top:16px;
                                    "
                                >

                                    <div
                                        style="
                                            font-size:32px;
                                        "
                                    >
                                        📖
                                    </div>


                                    <p class="muted">
                                        ግጥም ገና አልተጨመረም።
                                    </p>

                                </div>
                            `
                    }

                </div>


            </div>

        </div>
    `;
}


/* =========================================================
   TUTOR
========================================================= */
async function loadLessonProgress() {
    if (!supabaseClient) {
        console.error("❌ Supabase unavailable");
        return {};
    }

    try {
        // Always get the real authenticated user.
        const {
            data: userData,
            error: userError
        } = await supabaseClient.auth.getUser();

        if (userError || !userData?.user?.id) {
            console.error("❌ Could not get authenticated user:", userError);
            return {};
        }

        const user = userData.user;
        window.currentUser = user;

        // We only load lesson progress for students.
        if (state.role !== "student") {
            console.warn("⚠️ loadLessonProgress called while role is:", state.role);
            return {};
        }

        const classId = state.currentClass?.id;

        if (!classId) {
            console.error("❌ No current class ID");
            return {};
        }

        console.log("📚 Loading lesson progress:", {
            student_id: user.id,
            class_id: classId
        });

        const {
            data,
            error
        } = await supabaseClient
            .from("lesson_progress")
            .select(`
                lesson_id,
                completed
            `)
            .eq("student_id", user.id)
            .eq("class_id", classId);

        if (error) {
            console.error(
                "❌ Failed to load lesson progress:",
                error
            );
            return {};
        }

        const progress = Object.fromEntries(
            (data || []).map(item => [
                item.lesson_id,
                item.completed === true
            ])
        );

        console.log("✅ Loaded lesson progress:", progress);

        return progress;

    } catch (error) {
        console.error(
            "❌ Lesson progress error:",
            error
        );

        return {};
    }
}


async function completeLesson(lessonId) {
    if (!supabaseClient) {
        showToast("❌ Supabase unavailable");
        return false;
    }

    const {
        data: userData,
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !userData?.user?.id) {
        console.error("getUser error:", userError);
        showToast("❌ Login session not found");
        return false;
    }

    const user = userData.user;
    window.currentUser = user;

    const classId = state.currentClass?.id;

    if (!classId) {
        console.error("No class:", state.currentClass);
        showToast("❌ Class not found");
        return false;
    }

    if (!lessonId) {
        console.error("No lesson ID");
        showToast("❌ Lesson not found");
        return false;
    }

    console.log("Completing lesson:", {
        student_id: user.id,
        class_id: classId,
        lesson_id: lessonId
    });

    const { error } = await supabaseClient
        .from("lesson_progress")
        .upsert(
            {
                student_id: user.id,
                class_id: classId,
                lesson_id: lessonId,
                completed: true,
                completed_at: new Date().toISOString()
            },
            {
                onConflict: "student_id,class_id,lesson_id"
            }
        );

    if (error) {
        console.error(
            "lesson_progress upsert error:",
            error
        );

        showToast(`❌ ${error.message}`);
        return false;
    }

    showToast("✅ ትምህርቱ ተጠናቋል");

    return true;
}
async function tutorPage() {

    const user = window.currentUser;

    if (!user?.id) {
        return `
            <div class="card">
                <h3>🎓 በገና መማሪያ</h3>
                <div class="muted">
                    እባክዎ እንደገና ይግቡ።
                </div>
            </div>
        `;
    }


    /* =========================================================
       GET STUDENT CLASS
    ========================================================= */

    let classId =
        state.currentClass?.id || null;


    if (
        !classId &&
        typeof loadStudentClass === "function" &&
        navigator.onLine
    ) {

        try {

            await loadStudentClass(
                user.id
            );

            classId =
                state.currentClass?.id || null;

        } catch (error) {

            console.error(
                "Student class load failed:",
                error
            );

        }

    }


    /* =========================================================
       NO CLASS
    ========================================================= */

    if (!classId) {

        return `
            <div class="card">
                <h3>🎓 በገና መማሪያ</h3>

                <div class="muted">
                    ክፍል አልተገኘም።
                </div>
            </div>
        `;

    }


    /* =========================================================
       LOAD CACHED LESSONS FIRST
    ========================================================= */

    let lessonList = [];


    const cachedLessons =
        typeof getOfflineContent === "function"
            ? getOfflineContent(
                `lessons_${classId}`,
                []
            )
            : [];


    /* =========================================================
       OFFLINE MODE
    ========================================================= */

    if (!navigator.onLine) {

        lessonList =
            Array.isArray(cachedLessons)
                ? cachedLessons
                : [];

    }


    /* =========================================================
       ONLINE MODE
    ========================================================= */

    else {

        try {

            const {
                data,
                error
            } =
                await supabaseClient
                    .from("lessons")
                    .select(`
                        id,
                        title_am,
                        title_en,
                        body_am,
                        body_en,
                        level,
                        lesson_number,
                        action_type,
                        action_target
                    `)
                    .eq(
                        "class_id",
                        classId
                    )
                    .eq(
                        "published",
                        true
                    )
                    .order(
                        "lesson_number",
                        {
                            ascending: true
                        }
                    );


            /* =================================================
               SUPABASE ERROR
            ================================================= */

            if (error) {

                console.warn(
                    "⚠️ Tutor lessons online load failed:",
                    error
                );


                /*
                 * USE OFFLINE COPY
                 */

                lessonList =
                    Array.isArray(cachedLessons)
                        ? cachedLessons
                        : [];

            }


            /* =================================================
               SUCCESS
            ================================================= */

            else {

                lessonList =
                    Array.isArray(data)
                        ? data
                        : [];


                /*
                 * SAVE FOR OFFLINE USE
                 */

                if (
                    typeof saveOfflineContent ===
                    "function"
                ) {

                    saveOfflineContent(
                        `lessons_${classId}`,
                        lessonList
                    );

                }

            }

        } catch (error) {

            console.warn(
                "⚠️ Tutor lessons request failed. Using offline copy:",
                error
            );


            /*
             * FALL BACK TO SAVED LESSONS
             */

            lessonList =
                Array.isArray(cachedLessons)
                    ? cachedLessons
                    : [];

        }

    }


    /* =========================================================
       NO LESSONS
    ========================================================= */

    if (!lessonList.length) {

        return `
            <div class="card">
                <h3>🎓 በገና መማሪያ</h3>

                <div
                    class="muted"
                    style="margin-top:8px;"
                >
                    ${
                        navigator.onLine
                            ? "እስካሁን የታተመ ትምህርት የለም።"
                            : "ከመስመር ውጭ የተቀመጠ ትምህርት የለም። እባክዎ በመጀመሪያ ኢንተርኔት ላይ ትምህርቶቹን ይክፈቱ።"
                    }
                </div>
            </div>
        `;

    }


    /* =========================================================
       RENDER TUTOR
    ========================================================= */

    return `
        <div class="card">

            <h3>🎓 በገና መማሪያ</h3>

            <div class="muted">
                የትምህርት ክፍሎች
            </div>


            <div
                class="list"
                style="margin-top:15px;"
            >

                ${lessonList.map(lesson => `

                    <div
                        class="list-item"
                        style="
                            display:grid;
                            grid-template-columns:50px 1fr auto;
                            gap:12px;
                            align-items:center;
                        "
                    >

                        <div class="pill gold">

                            ${String(
                                lesson.lesson_number
                            ).padStart(
                                2,
                                "0"
                            )}

                        </div>


                        <div>

                            <b>

                                ${escapeHtml(
                                    state.language === "am"
                                        ? (
                                            lesson.title_am ||
                                            lesson.title_en ||
                                            ""
                                        )
                                        : (
                                            lesson.title_en ||
                                            lesson.title_am ||
                                            ""
                                        )
                                )}

                            </b>


                            <div class="muted">

                                ${escapeHtml(
                                    state.language === "am"
                                        ? (
                                            lesson.title_en ||
                                            ""
                                        )
                                        : (
                                            lesson.title_am ||
                                            ""
                                        )
                                )}

                            </div>

                        </div>


                        <button
                            type="button"
                            class="btn secondary lesson-button"
                            data-lesson-id="${lesson.id}"
                        >
                            ጀምር
                        </button>

                    </div>

                `).join("")}

            </div>


            <div
                id="lesson-viewer"
                style="margin-top:20px;"
            ></div>

        </div>
    `;
}


/* =========================================================
   STUDENT ASSIGNMENTS
========================================================= */

async function assignmentsPage() {

    if (!window.currentUser) {

        return `
            <div class="card">

                <h3>📝 የእኔ ስራዎች</h3>

                <div class="list-item">

                    <b>
                        ስራዎችን መጫን አልተቻለም
                    </b>

                </div>

            </div>
        `;

    }


    try {

        const userId =
            window.currentUser.id;


        /* =====================================================
           GET STUDENT CLASS
        ===================================================== */

        let classId =
            state.currentClass?.id || null;


        /*
         * ONLINE:
         * If class is not already in state, get it from Supabase.
         */

        if (
            !classId &&
            navigator.onLine &&
            supabaseClient
        ) {

            try {

                const {
                    data: enrollmentData,
                    error: enrollmentError
                } =
                    await supabaseClient
                        .from("enrollments")
                        .select(
                            "class_id"
                        )
                        .eq(
                            "student_id",
                            userId
                        )
                        .eq(
                            "status",
                            "active"
                        )
                        .order(
                            "joined_at",
                            {
                                ascending: false
                            }
                        )
                        .limit(1)
                        .maybeSingle();


                if (enrollmentError) {

                    console.warn(
                        "⚠️ Enrollment loading failed:",
                        enrollmentError
                    );

                } else {

                    classId =
                        enrollmentData?.class_id ||
                        null;

                }

            } catch (error) {

                console.warn(
                    "⚠️ Enrollment request failed:",
                    error
                );

            }

        }


        /* =====================================================
           NO CLASS
        ===================================================== */

        if (!classId) {

            return `
                <div class="card">

                    <h3>
                        📝 የእኔ ስራዎች
                    </h3>

                    <div class="list-item">

                        <b>
                            ክፍል አልተመደበም
                        </b>

                        <div class="muted">

                            እስካሁን
                            ወደ ክፍል
                            አልተመደቡም።

                        </div>

                    </div>

                </div>
            `;

        }


        /* =====================================================
           GET OFFLINE ASSIGNMENTS
        ===================================================== */

        let assignments = [];


        const cachedAssignments =
            typeof getOfflineContent ===
            "function"
                ? getOfflineContent(
                    `assignments_${classId}`,
                    []
                )
                : [];


        /* =====================================================
           OFFLINE
        ===================================================== */

        if (!navigator.onLine) {

            assignments =
                Array.isArray(
                    cachedAssignments
                )
                    ? cachedAssignments
                    : [];

        }


        /* =====================================================
           ONLINE
        ===================================================== */

        else {

            try {

                if (!supabaseClient) {

                    assignments =
                        Array.isArray(
                            cachedAssignments
                        )
                            ? cachedAssignments
                            : [];

                } else {

                    const {
                        data,
                        error:
                            assignmentsError
                    } =
                        await supabaseClient
                            .from(
                                "assignments"
                            )
                            .select(`
                                id,
                                title_am,
                                title_en,
                                instructions_am,
                                instructions_en,
                                due_at,
                                status,
                                created_at
                            `)
                            .eq(
                                "class_id",
                                classId
                            )
                            .order(
                                "created_at",
                                {
                                    ascending: false
                                }
                            );


                    if (assignmentsError) {

                        console.warn(
                            "⚠️ Assignments loading failed. Using offline copy:",
                            assignmentsError
                        );


                        assignments =
                            Array.isArray(
                                cachedAssignments
                            )
                                ? cachedAssignments
                                : [];

                    } else {

                        assignments =
                            Array.isArray(data)
                                ? data
                                : [];


                        /*
                         * SAVE ASSIGNMENTS
                         * FOR OFFLINE USE
                         */

                        if (
                            typeof saveOfflineContent ===
                            "function"
                        ) {

                            saveOfflineContent(
                                `assignments_${classId}`,
                                assignments
                            );

                        }

                    }

                }

            } catch (error) {

                console.warn(
                    "⚠️ Assignment request failed. Using offline copy:",
                    error
                );


                assignments =
                    Array.isArray(
                        cachedAssignments
                    )
                        ? cachedAssignments
                        : [];

            }

        }


        /* =====================================================
           NO ASSIGNMENTS
        ===================================================== */

        if (
            !assignments ||
            assignments.length === 0
        ) {

            return `
                <div class="grid two">

                    <div class="card">

                        <h3>
                            📝 የእኔ ስራዎች
                        </h3>

                        <div class="list">

                            <div class="list-item">

                                <b>

                                    ${
                                        navigator.onLine
                                            ? "ምንም ስራ አልተመደበም"
                                            : "ከመስመር ውጭ የተቀመጠ ስራ የለም"

                                    }

                                </b>

                                <div class="muted">

                                    ${
                                        navigator.onLine

                                            ? "አስተማሪዎ ስራ ሲመድብ እዚህ ይታያል።"

                                            : "እባክዎ በመጀመሪያ ኢንተርኔት ላይ ስራዎቹን ይክፈቱ።"
                                    }

                                </div>

                            </div>

                        </div>

                    </div>

                </div>
            `;

        }


        /* =====================================================
           CREATE ASSIGNMENT CARDS
        ===================================================== */

        const assignmentItems =
            assignments
                .map(assignment => {

                    const title =
                        state.language === "en"

                            ? (
                                assignment.title_en ||
                                assignment.title_am
                            )

                            : (
                                assignment.title_am ||
                                assignment.title_en
                            );


                    const instructions =
                        state.language === "en"

                            ? (
                                assignment.instructions_en ||
                                assignment.instructions_am
                            )

                            : (
                                assignment.instructions_am ||
                                assignment.instructions_en
                            );


                    const dueDate =
                        assignment.due_at

                            ? new Date(
                                assignment.due_at
                            ).toLocaleString()

                            : "No deadline";


                    return `
                        <div
                            class="list-item"
                        >

                            <b>

                                ${escapeHtml(
                                    title ||
                                    "Assignment"
                                )}

                            </b>


                            <div class="muted">

                                ${escapeHtml(
                                    instructions ||
                                    ""
                                )}

                            </div>


                            <div class="muted">

                                📅
                                ${escapeHtml(
                                    dueDate
                                )}

                            </div>


                            <button
                                class="primary-btn assignment-submit-btn"
                                data-assignment-id="${assignment.id}"
                                ${!navigator.onLine ? "disabled" : ""}
                            >

                                📤
                                ${
                                    navigator.onLine
                                        ? "ስራ ላክ"
                                        : "በመስመር ላይ ሲሆኑ ስራ ይላኩ"
                                }

                            </button>

                        </div>
                    `;

                })
                .join("");


        /* =====================================================
           RETURN PAGE
        ===================================================== */

        return `
            <div class="grid two">

                <div class="card">

                    <h3>
                        📝 የእኔ ስራዎች
                    </h3>


                    <div class="list">

                        ${assignmentItems}

                    </div>

                </div>

            </div>
        `;


    } catch (error) {

        console.error(
            "❌ Assignment page failed:",
            error
        );


        return `
            <div class="card">

                <h3>
                    📝 የእኔ ስራዎች
                </h3>

                <div class="list-item">

                    <b>
                        Something went wrong.
                    </b>

                </div>

            </div>
        `;

    }

}


/* =========================================================
   STUDENT CERTIFICATES
========================================================= */

async function certificatesPage() {
    const classId =
        state.currentClass?.id;

    const className =
        state.currentClass?.name ||
        "Begena Class";

    const courseCompleted =
        state.currentClass?.course_completed === true;

    if (
        !classId ||
        !window.currentUser?.id
    ) {
        return `
            <div class="card">
                <h3>🏆 ምስክር ወረቀት</h3>

                <div class="muted">
                    ክፍል ወይም የተማሪ
                    መረጃ አልተገኘም።
                </div>
            </div>
        `;
    }

    const {
        data: lessons,
        error: lessonsError
    } = await supabaseClient
        .from("lessons")
        .select("id")
        .eq("class_id", classId);

    if (lessonsError) {
        console.error(
            "❌ CERTIFICATE LESSON ERROR:",
            lessonsError
        );

        return `
            <div class="card">
                <h3>🏆 ምስክር ወረቀት</h3>

                <div class="muted">
                    የትምህርት መረጃ
                    መጫን አልተቻለም።
                </div>
            </div>
        `;
    }

    const lessonIds =
        (lessons || []).map(
            lesson => lesson.id
        );

    const {
        data: progress,
        error: progressError
    } = await supabaseClient
        .from("lesson_progress")
        .select(
            "lesson_id, completed"
        )
        .eq(
            "student_id",
            window.currentUser.id
        )
        .eq(
            "class_id",
            classId
        );

    if (progressError) {
        console.error(
            "❌ CERTIFICATE PROGRESS ERROR:",
            progressError
        );

        return `
            <div class="card">
                <h3>🏆 ምስክር ወረቀት</h3>

                <div class="muted">
                    የእድገት መረጃ
                    መጫን አልተቻለም።
                </div>
            </div>
        `;
    }

    const completedCount =
        (progress || []).filter(
            item =>
                item.completed &&
                lessonIds.includes(
                    item.lesson_id
                )
        ).length;

    const totalLessons =
        lessonIds.length;

    const percentage =
        totalLessons > 0
            ? Math.round(
                (
                    completedCount /
                    totalLessons
                ) * 100
            )
            : 0;

    return `
        <div class="card">
            <div
                style="
                    text-align:center;
                    padding:20px;
                "
            >

                <div
                    style="
                        font-size:50px;
                        margin-bottom:10px;
                    "
                >
                    🏆
                </div>

                <h2>
                    የበገና ትምህርት
                    ምስክር ወረቀት
                </h2>

                <div class="big gold">
                    ${escapeHtml(
                        className
                    )}
                </div>

                <div
                    class="muted"
                    style="margin-top:10px;"
                >
                    የተጠናቀቁ ትምህርቶች:
                    ${completedCount}/${totalLessons}
                </div>

                <div
                    class="muted"
                    style="margin-top:5px;"
                >
                    እድገት: ${percentage}%
                </div>

                ${
                    !courseCompleted
                        ? `
                            <div
                                class="muted"
                                style="
                                    margin-top:20px;
                                "
                            >
                                ⏳ የክፍሉ ትምህርት
                                እስካሁን
                                እየተካሄደ ነው።
                            </div>

                            <div
                                class="muted"
                                style="
                                    margin-top:8px;
                                "
                            >
                                ሁሉንም የተለቀቁ
                                ትምህርቶች
                                ብትጨርስም፣
                                አስተማሪው
                                ክፍሉን
                                እስኪያጠናቅቅ
                                ድረስ ምስክር
                                ወረቀቱ
                                አይከፈትም።
                            </div>
                        `
                        : completedCount ===
                          totalLessons &&
                          totalLessons > 0
                            ? `
                                <div
                                    class="pill gold"
                                    style="
                                        display:inline-block;
                                        margin-top:20px;
                                    "
                                >
                                    ✅ ምስክር ወረቀት
                                    ለማግኘት
                                    ብቁ ነህ
                                </div>

                                <div
                                    style="
                                        margin-top:15px;
                                    "
                                >
                                    <button
                                        type="button"
                                        class="btn primary"
                                        id="download-certificate"
                                    >
                                        🏆 ምስክር
                                        ወረቀት አግኝ
                                    </button>
                                </div>
                            `
                            : `
                                <div
                                    class="muted"
                                    style="
                                        margin-top:20px;
                                    "
                                >
                                    📚 ክፍሉ
                                    ተጠናቋል።
                                    የቀሩትን
                                    ትምህርቶች
                                    አጠናቅቅ።
                                </div>
                            `
                }

            </div>
        </div>
    `;
}


/* =========================================================
   MENTOR STUDENTS
========================================================= */

function mentorStudentsPage() {

    const classes =
        state.mentorClasses || [];

    const students =
        state.mentorAttendanceStudents || [];


    const classOptions =
        classes.length

            ? classes
                .map(
                    classroom => `
                        <option
                            value="${escapeHtml(classroom.id)}"
                        >
                            ${escapeHtml(
                                classroom.name
                            )}
                            ${
                                Number.isFinite(
                                    classroom.level
                                )
                                    ? ` • Level ${classroom.level}`
                                    : ""
                            }
                        </option>
                    `
                )
                .join("")

            : `
                <option value="">
                    No class available
                </option>
            `;


    return `

        <div class="card">

            <div class="row space">

                <div>

                    <h3>
                        👥 ተማሪዎች
                    </h3>

                    <div class="muted">
                        በእርስዎ የተመደበው
                        ክፍል ውስጥ ያሉ
                        እውነተኛ ተማሪዎች
                    </div>

                </div>


                <button
                    type="button"
                    class="btn primary"
                    id="add-student-button"
                >
                    + Add Student
                </button>

            </div>


            <div
                class="grid three"
                style="margin-top:16px;"
            >

                <div class="card">

                    <div class="muted">
                        👥 Total Students
                    </div>

                    <div class="big gold">
                        ${students.length}
                    </div>

                </div>


                <div class="card">

                    <div class="muted">
                        ✅ Active
                    </div>

                    <div class="big gold">
                        ${
                            students.filter(
                                student =>
                                    student.status === "active"
                            ).length
                        }
                    </div>

                </div>


                <div class="card">

                    <div class="muted">
                        🏫 Classes
                    </div>

                    <div class="big gold">
                        ${classes.length}
                    </div>

                </div>

            </div>


           <div
    class="row"
    style="
        margin-top:18px;
        gap:10px;
        flex-wrap:wrap;
    "
>

    <input
        id="teacher-students-search"
        type="search"
        placeholder="🔎 Search student..."
        style="
            flex:1;
            min-width:220px;
        "
    >

    <button
        type="button"
        class="btn primary"
        id="teacher-students-search-button"
    >
        🔎 Search
    </button>

</div>


<div
    class="list"
    id="teacher-students-list"
    style="margin-top:14px;"
>

                ${
                    students.length

                        ? students
                            .map(
                                student => {

                                    const profile =
                                        student.profiles ||
                                        {};

                                    const classroom =
                                        student.classes ||
                                        {};

                                    return `

                                        <div
    class="list-item"
    data-search="${escapeHtml(
        [
            profile.full_name,
            profile.student_id,
            profile.phone,
            classroom.name
        ]
            .filter(Boolean)
            .join(" ")
    )}"
>

                                            <div
                                                class="row space"
                                                style="
                                                    align-items:flex-start;
                                                    gap:15px;
                                                    flex-wrap:wrap;
                                                "
                                            >

                                                <div
                                                    style="
                                                        min-width:180px;
                                                    "
                                                >

                                                    <b>
                                                        ${escapeHtml(
                                                            profile.full_name ||
                                                            "Student"
                                                        )}
                                                    </b>

                                                    <div class="muted">
                                                        ${
                                                            profile.student_id
                                                                ? escapeHtml(
                                                                    profile.student_id
                                                                )
                                                                : "No Student ID"
                                                        }
                                                    </div>

                                                </div>


                                                <div
                                                    style="
                                                        min-width:150px;
                                                    "
                                                >

                                                    <div class="muted">
                                                        Phone
                                                    </div>

                                                    <div>
                                                        ${
                                                            profile.phone
                                                                ? escapeHtml(
                                                                    profile.phone
                                                                )
                                                                : "—"
                                                        }
                                                    </div>

                                                </div>


                                                <div
                                                    style="
                                                        min-width:160px;
                                                    "
                                                >

                                                    <div class="muted">
                                                        Class
                                                    </div>

                                                    <div>
                                                        ${escapeHtml(
                                                            classroom.name ||
                                                            "—"
                                                        )}
                                                    </div>

                                                </div>
                                                
                                                <div
    style="
        min-width:210px;
    "
>

    <div class="muted">
        📚 Progress
    </div>

    ${
        (() => {

            const progress =
                state.mentorStudentProgress?.[
                    student.student_id
                ] || {
                    completed: 0,
                    total: 0,
                    percent: 0,
                    last_completed_at: null
                };

            let status =
                "⏳ Not started";

            let statusClass = "";

            if (
                progress.completed > 0
            ) {

                const last =
                    progress.last_completed_at
                        ? new Date(
                            progress.last_completed_at
                        )
                        : null;

                const daysSince =
                    last
                        ? Math.floor(
                            (
                                Date.now() -
                                last.getTime()
                            ) /
                            (1000 * 60 * 60 * 24)
                        )
                        : null;

                if (
                    daysSince !== null &&
                    daysSince <= 7
                ) {
                    status =
                        "🟢 Working";

                    statusClass =
                        "gold";

                } else {

                    status =
                        "🟠 Inactive";
                }
            }

            return `
                <div
                    style="
                        display:flex;
                        align-items:center;
                        gap:8px;
                        flex-wrap:wrap;
                    "
                >

                    <b>
                        ${progress.completed}/${progress.total}
                        lessons
                    </b>

                    <span
                        class="pill ${statusClass}"
                    >
                        ${status}
                    </span>

                </div>

                <div
                    style="
                        height:6px;
                        margin-top:7px;
                        border-radius:999px;
                        background:rgba(255,255,255,.07);
                        overflow:hidden;
                    "
                >

                    <div
                        style="
                            width:${progress.percent}%;
                            height:100%;
                            background:linear-gradient(
                                90deg,
                                #d5ad51,
                                #f0cf73
                            );
                        "
                    ></div>

                </div>

                <div
                    class="muted"
                    style="
                        margin-top:5px;
                    "
                >
                    ${progress.percent}% complete
                </div>
            `;

        })()
    }

</div>

                                                <div
                                                    style="
                                                        min-width:100px;
                                                    "
                                                >

                                                    <div class="muted">
                                                        Level
                                                    </div>

                                                    <div>
                                                        ${
                                                            Number.isFinite(
                                                                classroom.level
                                                            )
                                                                ? classroom.level
                                                                : "—"
                                                        }
                                                    </div>

                                                </div>


                                                <div>

                                                    <span
                                                        class="pill ${
                                                            student.status === "active"
                                                                ? "gold"
                                                                : ""
                                                        }"
                                                    >
                                                        ${
                                                            student.status === "active"
                                                                ? "✅ Active"
                                                                : escapeHtml(
                                                                    student.status ||
                                                                    "Unknown"
                                                                )
                                                        }
                                                    </span>

                                                </div>

                                            </div>

                                        </div>

                                    `;

                                }
                            )
                            .join("")

                        : `

                            <div class="list-item">

                                <b>
                                    በዚህ ክፍል
                                    ተመዝጋቢ ተማሪ
                                    የለም።
                                </b>

                                <div class="muted">
                                    + Add Student
                                    በመጫን አዲስ
                                    ተማሪ ያስገቡ።
                                </div>

                            </div>

                        `
                }

            </div>

        </div>


        <!-- ADD STUDENT MODAL -->

        <div
            id="add-student-modal"
            style="
                display:none;
                position:fixed;
                inset:0;
                z-index:1000;
                padding:20px;
                background:rgba(0,0,0,.72);
                align-items:center;
                justify-content:center;
            "
        >

            <div
                class="card"
                style="
                    width:min(560px,100%);
                    max-height:90vh;
                    overflow:auto;
                "
            >

                <div class="row space">

                    <div>

                        <h3>
                            ➕ Add Student
                        </h3>

                        <div class="muted">
                            አዲስ ተማሪ
                            ወደ ክፍል ያስገቡ
                        </div>

                    </div>

                    <button
                        type="button"
                        class="btn secondary"
                        id="close-add-student"
                    >
                        ✕
                    </button>

                </div>


                <form
                    id="add-student-form"
                    style="
                        display:grid;
                        gap:12px;
                        margin-top:18px;
                    "
                >

                    <input
                        id="new-student-id"
                        type="text"
                        placeholder="Student ID"
                        autocomplete="off"
                        required
                    >


                    <input
                        id="new-student-name"
                        type="text"
                        placeholder="Full name"
                        autocomplete="name"
                        required
                    >


                    <input
                        id="new-student-phone"
                        type="tel"
                        placeholder="Phone"
                        autocomplete="tel"
                    >


                    <select
                        id="new-student-class"
                        required
                    >

                        ${classOptions}

                    </select>


                    <input
                        id="new-student-password"
                        type="password"
                        placeholder="Password (minimum 6 characters)"
                        autocomplete="new-password"
                        minlength="6"
                        required
                    >


                    <div
                        id="add-student-error"
                        class="muted"
                        style="
                            display:none;
                            padding:10px;
                            border-radius:10px;
                        "
                    ></div>


                    <div
                        class="row"
                        style="
                            justify-content:flex-end;
                            margin-top:8px;
                        "
                    >

                        <button
                            type="button"
                            class="btn secondary"
                            id="cancel-add-student"
                        >
                            Cancel
                        </button>


                        <button
                            type="submit"
                            class="btn primary"
                            id="save-new-student"
                        >
                            👤 Create Student
                        </button>

                    </div>

                </form>

            </div>

        </div>

    `;

}


/* =========================================================
   MENTOR ASSIGNMENTS
========================================================= */

async function mentorAssignmentsPage() {

    const mentorClass = state.mentorClasses?.[0];

    if (!mentorClass) {
        return `
            <div class="card">

                <h3>
                    📝 አዲስ ስራ ፍጠር
                </h3>

                <div class="list-item">

                    <b>ክፍል አልተገኘም</b>

                    <div class="muted">
                        ስራ ለመላክ መጀመሪያ
                        አንድ ክፍል መመደብ አለብዎት።
                    </div>

                </div>

            </div>
        `;
    }

    // Load existing assignments for this mentor's class
    const {
        data: assignments,
        error
    } = await supabaseClient
        .from("assignments")
        .select(`
            id,
            title_am,
            instructions_am,
            due_at,
            status,
            created_at
        `)
        .eq("class_id", mentorClass.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error(
            "❌ Mentor assignments loading failed:",
            error
        );
    }

    const assignmentList =
        assignments?.length
            ? assignments.map(assignment => {

                const createdAt =
                    assignment.created_at
                        ? new Date(
                            assignment.created_at
                        ).toLocaleString()
                        : "";

                return `
                    <div class="list-item">

                        <b>
                            ${assignment.title_am || "ያልተሰየመ ስራ"}
                        </b>

                        <div class="muted">
                            ${assignment.instructions_am || ""}
                        </div>

                        <div class="muted">
                            📅 ${createdAt}
                        </div>

                    </div>
                `;

            }).join("")
            : `
                <div class="list-item">

                    <b>
                        እስካሁን ስራ አልተላከም
                    </b>

                    <div class="muted">
                        ከላይ ባለው ፎርም አዲስ ስራ ይፍጠሩ።
                    </div>

                </div>
            `;

    return `

        <div class="grid two">

            <div class="card">

                <h3>
                    📝 አዲስ ስራ ፍጠር
                </h3>

                <div
                    style="
                        display:grid;
                        gap:10px;
                    "
                >

                    <input
                        id="assignment-title"
                        placeholder="የስራው ርዕስ"
                    >

                    <textarea
                        id="assignment-description"
                        placeholder="መመሪያ"
                    ></textarea>

                    <button
                        type="button"
                        class="btn primary"
                        id="publish-assignment"
                    >
                        📤 ላክ
                    </button>

                </div>

            </div>


            <div class="card">

                <h3>
                    የተላኩ ስራዎች
                </h3>

                <div class="list">

                    ${assignmentList}

                </div>

            </div>

        </div>

    `;
}


/* =========================================================
   ANNOUNCEMENTS
========================================================= */

function announcementsPage() {

    return `

        <div class="grid two">

            <!-- CREATE ANNOUNCEMENT -->

            <div class="card">

                <div class="pill gold" style="margin-bottom:10px;">
                    📢 Mentor
                </div>

                <h3>
                    ማስታወቂያ ፍጠር
                </h3>

                <div
                    style="
                        display:grid;
                        gap:12px;
                    "
                >

                    <input
                        id="announcement-title"
                        placeholder="ርዕስ"
                    >

                    <textarea
                        id="announcement-message"
                        rows="5"
                        placeholder="መልዕክት..."
                    ></textarea>


                    <!-- VOICE RECORDING -->

                    <div
                        style="
                            padding:14px;
                            border-radius:14px;
                            border:1px solid rgba(255,255,255,.08);
                            background:rgba(255,255,255,.02);
                        "
                    >

                        <div
                            class="muted"
                            id="announcement-recording-status"
                        >
                            🎙️ የድምፅ ማስታወቂያ አልተቀረፀም
                        </div>


                        <div
                            style="
                                display:flex;
                                gap:8px;
                                flex-wrap:wrap;
                                margin-top:10px;
                            "
                        >

                            <button
                                type="button"
                                class="btn secondary"
                                id="start-announcement-recording"
                            >
                                🎙️ Record
                            </button>


                            <button
                                type="button"
                                class="btn"
                                id="stop-announcement-recording"
                                disabled
                            >
                                ⏹ Stop
                            </button>

                        </div>


                        <audio
                            id="announcement-audio-preview"
                            controls
                            style="
                                display:none;
                                width:100%;
                                margin-top:12px;
                            "
                        ></audio>

                    </div>


                    <button
                        type="button"
                        class="btn primary"
                        id="publish-announcement"
                    >
                        📢 ላክ
                    </button>

                </div>

            </div>


            <!-- ANNOUNCEMENT HISTORY -->

            <div class="card">

                <h3>
                    የቅርብ ማስታወቂያዎች
                </h3>

                <div
                    class="muted"
                    style="margin-bottom:14px;"
                >
                    የተላኩ ማስታወቂያዎች
                </div>

                <div
                    class="list"
                    id="announcements-list"
                >

                    <div class="list-item">
                        ማስታወቂያዎች
                        እዚህ ይታያሉ።
                    </div>

                </div>

            </div>

        </div>

    `;

}
async function studentAnnouncementsPage() {

    const classId =
        state.currentClass?.id ||
        state.studentClass?.id;


    /* =========================================================
       NO CLASS
    ========================================================= */

    if (!classId) {

        return `
            <div class="card">

                <h3>📢 ማስታወቂያ</h3>

                <div class="muted">
                    ክፍል አልተገኘም።
                </div>

            </div>
        `;

    }


    /* =========================================================
       GET SAVED OFFLINE ANNOUNCEMENTS
    ========================================================= */

    const cachedAnnouncements =
        typeof getOfflineContent === "function"
            ? getOfflineContent(
                `announcements_${classId}`,
                []
            )
            : [];


    let announcements = [];


    /* =========================================================
       OFFLINE
    ========================================================= */

    if (!navigator.onLine) {

        announcements =
            Array.isArray(cachedAnnouncements)
                ? cachedAnnouncements
                : [];

    }


    /* =========================================================
       ONLINE
    ========================================================= */

    else {

        try {

            if (!supabaseClient) {

                announcements =
                    Array.isArray(cachedAnnouncements)
                        ? cachedAnnouncements
                        : [];

            } else {

                const {
                    data,
                    error
                } =
                    await supabaseClient
                        .from("announcements")
                        .select(`
                            id,
                            title,
                            body,
                            audio_path,
                            published_at,
                            created_at
                        `)
                        .eq(
                            "target_class_id",
                            classId
                        )
                        .eq(
                            "published",
                            true
                        )
                        .order(
                            "published_at",
                            {
                                ascending: false
                            }
                        );


                /* =================================================
                   SUPABASE ERROR
                ================================================= */

                if (error) {

                    console.warn(
                        "⚠️ Announcements failed. Using offline copy:",
                        error
                    );

                    announcements =
                        Array.isArray(
                            cachedAnnouncements
                        )
                            ? cachedAnnouncements
                            : [];

                }


                /* =================================================
                   SUCCESS
                ================================================= */

                else {

                    announcements =
                        Array.isArray(data)
                            ? data
                            : [];


                    /*
                     * Get audio URLs while online.
                     */

                    for (
                        const announcement
                        of announcements
                    ) {

                        announcement._offlineAudioUrl =
                            "";


                        if (
                            announcement.audio_path
                        ) {

                            try {

                                const {
                                    data:
                                        signedData,
                                    error:
                                        signedError
                                } =
                                    await supabaseClient
                                        .storage
                                        .from(
                                            "announcement-audio"
                                        )
                                        .createSignedUrl(
                                            announcement.audio_path,
                                            3600
                                        );


                                if (
                                    !signedError
                                ) {

                                    announcement
                                        ._offlineAudioUrl =
                                            signedData
                                                ?.signedUrl ||
                                            "";

                                }

                            } catch (
                                audioError
                            ) {

                                console.warn(
                                    "⚠️ Announcement audio URL failed:",
                                    audioError
                                );

                            }

                        }

                    }


                    /*
                     * SAVE EVERYTHING
                     * FOR OFFLINE USE
                     */

                    if (
                        typeof saveOfflineContent ===
                        "function"
                    ) {

                        saveOfflineContent(
                            `announcements_${classId}`,
                            announcements
                        );

                    }

                }

            }

        } catch (error) {

            console.warn(
                "⚠️ Announcements request failed. Using offline copy:",
                error
            );


            announcements =
                Array.isArray(
                    cachedAnnouncements
                )
                    ? cachedAnnouncements
                    : [];

        }

    }


    /* =========================================================
       NO ANNOUNCEMENTS
    ========================================================= */

    if (
        !announcements ||
        announcements.length === 0
    ) {

        return `
            <div class="card">

                <h3>📢 ማስታወቂያ</h3>

                <div class="muted">

                    ${
                        navigator.onLine
                            ? "እስካሁን ማስታወቂያ የለም።"
                            : "ከመስመር ውጭ የተቀመጠ ማስታወቂያ የለም።"
                    }

                </div>

            </div>
        `;

    }


    /* =========================================================
       BUILD ANNOUNCEMENTS
    ========================================================= */

    const items = [];


    for (
        const announcement
        of announcements
    ) {

        /*
         * Use the saved URL when offline.
         * Use it directly when online too.
         */

        const audioUrl =
            announcement._offlineAudioUrl ||
            "";


        items.push(`

            <div class="list-item">

                <div class="row space">

                    <div>

                        <b>

                            📢
                            ${escapeHtml(
                                announcement.title ||
                                ""
                            )}

                        </b>


                        <div class="muted">

                            ${escapeHtml(
                                announcement.body ||
                                ""
                            )}

                        </div>

                    </div>

                </div>


                ${
                    audioUrl

                        ? `

                            <audio
                                controls
                                preload="none"
                                style="
                                    width:100%;
                                    margin-top:10px;
                                "
                            >

                                <source
                                    src="${escapeHtml(
                                        audioUrl
                                    )}"
                                    type="audio/webm"
                                >

                            </audio>

                        `

                        : ""
                }


                <div
                    class="muted"
                    style="margin-top:8px;"
                >

                    ${
                        announcement.published_at

                            ? new Date(
                                announcement.published_at
                            ).toLocaleString()

                            : ""
                    }

                </div>

            </div>

        `);

    }


    /* =========================================================
       RETURN PAGE
    ========================================================= */

    return `

        <div class="card">

            <h3>
                📢 ማስታወቂያዎች
            </h3>


            <div
                class="list"
                style="margin-top:15px;"
            >

                ${items.join("")}

            </div>

        </div>

    `;

}

/* =========================================================
   MENTOR LESSONS
========================================================= */

function mentorLessonsPage() {

    return `

        <div class="card">

            <div class="row space">

                <div>

                    <h3>
                        📚 ትምህርቶች
                    </h3>

                    <div class="muted">
                        የመማሪያ ይዘት
                    </div>

                </div>

                <button
                    type="button"
                    class="btn primary"
                    id="new-lesson"
                >
                    + ትምህርት
                </button>

            </div>


            <div
                class="list"
                style="margin-top:15px;"
            >

                <div class="list-item">

                    <b>
                        01 — የበገና መግቢያ
                    </b>

                    <div class="muted">
                        Level 1
                    </div>

                </div>


                <div class="list-item">

                    <b>
                        02 — የበገና ክፍሎች
                    </b>

                    <div class="muted">
                        Level 1
                    </div>

                </div>


                <div class="list-item">

                    <b>
                        03 — 10 ገመዶች
                    </b>

                    <div class="muted">
                        Level 1
                    </div>

                </div>

            </div>

        </div>

    `;

}


/* =========================================================
   MENTOR CERTIFICATES
========================================================= */

function mentorCertificatesPage() {
    const classroom =
        state.mentorClasses?.[0];

    if (!classroom) {
        return `
            <div class="card">
                <h3>
                    🏆 ምስክር ወረቀት
                </h3>

                <div class="muted">
                    ክፍል አልተመደበም።
                </div>
            </div>
        `;
    }

    const completed =
        classroom.course_completed === true;

    return `
        <div class="card">
            <h3>
                🏆 የምስክር ወረቀት
                አስተዳደር
            </h3>

            <div
                class="list"
                style="margin-top:16px;"
            >

                <div class="list-item">
                    <b>
                        ${escapeHtml(
                            classroom.name ||
                            "Begena Class"
                        )}
                    </b>

                    <div
                        class="muted"
                        style="margin-top:6px;"
                    >
                        ${
                            completed
                                ? "✅ ኮርሱ ተጠናቋል"
                                : "🟢 ኮርሱ እየተሰጠ ነው"
                        }
                    </div>
                </div>

                <div class="list-item">
                    ${
                        completed
                            ? `
                                <b>
                                    ✅ ክፍሉ
                                    ተጠናቋል
                                </b>

                                <div
                                    class="muted"
                                    style="
                                        margin-top:6px;
                                    "
                                >
                                    ተማሪዎች
                                    ሁሉንም
                                    ትምህርቶች
                                    ሲጨርሱ
                                    ምስክር
                                    ወረቀት
                                    ማግኘት
                                    ይችላሉ።
                                </div>
                            `
                            : `
                                <b>
                                    ⏳ ክፍሉ
                                    እየተሰጠ
                                    ነው
                                </b>

                                <div
                                    class="muted"
                                    style="
                                        margin-top:6px;
                                    "
                                >
                                    ሁሉም ትምህርቶች
                                    ከተሰጡ
                                    በኋላ እና
                                    ኮርሱ
                                    ሲጠናቀቅ
                                    ይህን ቁልፍ
                                    ይጫኑ።
                                </div>

                                <button
                                    type="button"
                                    class="btn primary"
                                    id="finish-course"
                                    style="
                                        margin-top:12px;
                                    "
                                >
                                    ✅ ኮርሱን
                                    አጠናቅቅ
                                </button>
                            `
                    }
                </div>

            </div>
        </div>
    `;
}

/* =========================================================
   PAGE RENDER
========================================================= */

/* =========================================================
   LEADERBOARD
========================================================= */

async function leaderboardPage() {

    /*
     * =========================================================
     * GET CLASS ID
     * =========================================================
     */

    const classId =
        state.currentClass?.id ||
        state.mentorClasses?.[0]?.id;


    if (!classId) {

        return `
            <div class="card">

                <h3>🏆 Leaderboard</h3>

                <div class="muted">
                    No active class found.
                </div>

            </div>
        `;

    }


    /*
     * =========================================================
     * LOAD SAVED OFFLINE LEADERBOARD
     * =========================================================
     */

    let rows = [];

    const cachedLeaderboard =
        typeof getOfflineContent === "function"
            ? getOfflineContent(
                `leaderboard_${classId}`,
                []
            )
            : [];


    /*
     * =========================================================
     * OFFLINE
     * =========================================================
     */

    if (!navigator.onLine) {

        rows =
            Array.isArray(cachedLeaderboard)
                ? cachedLeaderboard
                : [];

    }


    /*
     * =========================================================
     * ONLINE
     * =========================================================
     */

    else {

        try {

            if (!supabaseClient) {

                rows =
                    Array.isArray(cachedLeaderboard)
                        ? cachedLeaderboard
                        : [];

            } else {

                const {
                    data,
                    error
                } =
                    await supabaseClient.rpc(
                        "get_class_leaderboard",
                        {
                            p_class_id:
                                classId
                        }
                    );


                /*
                 * SUPABASE ERROR
                 */

                if (error) {

                    console.warn(
                        "⚠️ Leaderboard failed. Using offline copy:",
                        error
                    );

                    rows =
                        Array.isArray(
                            cachedLeaderboard
                        )
                            ? cachedLeaderboard
                            : [];

                }


                /*
                 * SUCCESS
                 */

                else {

                    rows =
                        Array.isArray(data)
                            ? data
                            : [];


                    /*
                     * SAVE LEADERBOARD
                     * FOR OFFLINE USE
                     */

                    if (
                        typeof saveOfflineContent ===
                        "function"
                    ) {

                        saveOfflineContent(
                            `leaderboard_${classId}`,
                            rows
                        );

                    }

                }

            }

        } catch (error) {

            console.warn(
                "⚠️ Leaderboard request failed. Using offline copy:",
                error
            );


            rows =
                Array.isArray(cachedLeaderboard)
                    ? cachedLeaderboard
                    : [];

        }

    }


    /*
     * =========================================================
     * CURRENT STUDENT
     * =========================================================
     */

    const currentUser =
        window.currentUser?.id;


    const myRow =
        rows.find(
            row =>
                row.student_id ===
                currentUser
        );


    /*
     * =========================================================
     * LEADERBOARD PAGE
     * =========================================================
     */

    return `

        <div
            class="card"
            style="
                margin-bottom:18px;
                overflow:hidden;
                position:relative;
            "
        >

            <div
                style="
                    display:flex;
                    justify-content:space-between;
                    align-items:flex-start;
                    gap:18px;
                    flex-wrap:wrap;
                "
            >

                <div>

                    <div
                        class="pill gold"
                        style="margin-bottom:10px;"
                    >
                        🏆 CLASS LEADERBOARD
                    </div>


                    <h2 style="margin:0 0 8px;">
                        የደረጃ ሰንጠረዥ
                    </h2>


                    <div class="muted">

                        ትምህርትህን ስትጨርስ
                        ደረጃህን አሻሽል።

                    </div>

                </div>


                <div class="pill">

                    ${rows.length}
                    students

                </div>

            </div>

        </div>


        ${
            myRow
                ? `

                    <div
                        class="grid three"
                        style="margin-bottom:18px;"
                    >

                        <div class="card">

                            <div class="muted">
                                🏅 Your Rank
                            </div>

                            <div class="big gold">
                                #${myRow.rank_no}
                            </div>

                        </div>


                        <div class="card">

                            <div class="muted">
                                📚 Completed
                            </div>

                            <div class="big">

                                ${myRow.completed_lessons}
                                /
                                ${myRow.total_lessons}

                            </div>

                        </div>


                        <div class="card">

                            <div class="muted">
                                📈 Progress
                            </div>

                            <div class="big gold">

                                ${myRow.progress_percent}%

                            </div>

                        </div>

                    </div>

                `
                : ""
        }


        <div class="card">


            ${
                state.role === "mentor"
                    ? `

                        <div
                            class="row"
                            style="
                                margin-bottom:16px;
                                gap:10px;
                                flex-wrap:wrap;
                            "
                        >

                            <input
                                id="teacher-leaderboard-search"
                                type="search"
                                placeholder="🔎 Search student..."
                                style="
                                    flex:1;
                                    min-width:220px;
                                "
                            >


                            <button
                                type="button"
                                class="btn primary"
                                id="teacher-leaderboard-search-button"
                            >
                                🔎 Search
                            </button>

                        </div>

                    `
                    : ""
            }


            ${
                rows.length

                    ? `

                        <div
                            id="teacher-leaderboard-list"
                            style="
                                display:grid;
                                gap:10px;
                            "
                        >

                            ${rows.map(
                                row => {

                                    const isMe =
                                        row.student_id ===
                                        currentUser;


                                    let medal =
                                        `#${row.rank_no}`;


                                    if (
                                        Number(
                                            row.rank_no
                                        ) === 1
                                    ) {

                                        medal =
                                            "🥇";

                                    }


                                    if (
                                        Number(
                                            row.rank_no
                                        ) === 2
                                    ) {

                                        medal =
                                            "🥈";

                                    }


                                    if (
                                        Number(
                                            row.rank_no
                                        ) === 3
                                    ) {

                                        medal =
                                            "🥉";

                                    }


                                    return `

                                        <div
                                            class="list-item"
                                            data-search="${escapeHtml(
                                                [
                                                    row.full_name,
                                                    row.public_student_id
                                                ]
                                                    .filter(Boolean)
                                                    .join(" ")
                                            )}"
                                            style="
                                                padding:16px;

                                                border:${
                                                    isMe
                                                        ? "1px solid rgba(213,173,81,.45)"
                                                        : "1px solid rgba(255,255,255,.08)"
                                                };

                                                background:${
                                                    isMe
                                                        ? "rgba(213,173,81,.07)"
                                                        : "rgba(255,255,255,.02)"
                                                };
                                            "
                                        >

                                            <div
                                                style="
                                                    display:flex;
                                                    align-items:center;
                                                    gap:14px;
                                                "
                                            >

                                                <div
                                                    style="
                                                        width:48px;
                                                        height:48px;
                                                        min-width:48px;
                                                        border-radius:14px;
                                                        display:grid;
                                                        place-items:center;
                                                        font-size:20px;
                                                        font-weight:900;
                                                        background:rgba(213,173,81,.10);
                                                    "
                                                >

                                                    ${medal}

                                                </div>


                                                <div
                                                    style="
                                                        flex:1;
                                                        min-width:0;
                                                    "
                                                >

                                                    <div
                                                        style="
                                                            font-weight:850;
                                                        "
                                                    >

                                                        ${escapeHtml(
                                                            row.full_name ||
                                                            "Student"
                                                        )}


                                                        ${
                                                            isMe
                                                                ? `

                                                                    <span
                                                                        class="pill gold"
                                                                        style="
                                                                            margin-left:7px;
                                                                        "
                                                                    >
                                                                        You
                                                                    </span>

                                                                `
                                                                : ""
                                                        }

                                                    </div>


                                                    <div
                                                        class="muted"
                                                        style="
                                                            margin-top:4px;
                                                        "
                                                    >

                                                        ${
                                                            escapeHtml(
                                                                row.public_student_id ||
                                                                "Student"
                                                            )
                                                        }

                                                    </div>

                                                </div>


                                                <div
                                                    style="
                                                        text-align:right;
                                                        min-width:100px;
                                                    "
                                                >

                                                    <b>

                                                        ${
                                                            row.completed_lessons
                                                        }/
                                                        ${
                                                            row.total_lessons
                                                        }

                                                    </b>


                                                    <div
                                                        class="muted"
                                                        style="
                                                            margin-top:4px;
                                                        "
                                                    >

                                                        ${
                                                            row.progress_percent
                                                        }%

                                                    </div>

                                                </div>

                                            </div>


                                            <div
                                                style="
                                                    height:7px;
                                                    margin-top:12px;
                                                    border-radius:999px;
                                                    background:rgba(255,255,255,.07);
                                                    overflow:hidden;
                                                "
                                            >

                                                <div
                                                    style="
                                                        width:${Math.max(
                                                            0,
                                                            Math.min(
                                                                100,
                                                                Number(
                                                                    row.progress_percent
                                                                ) || 0
                                                            )
                                                        )}%;

                                                        height:100%;

                                                        border-radius:999px;

                                                        background:linear-gradient(
                                                            90deg,
                                                            #d5ad51,
                                                            #f0cf73
                                                        );
                                                    "
                                                ></div>

                                            </div>

                                        </div>

                                    `;

                                }
                            ).join("")}

                        </div>

                    `

                    : `

                        <div
                            style="
                                padding:45px 20px;
                                text-align:center;
                            "
                        >

                            <div
                                style="
                                    font-size:48px;
                                    margin-bottom:12px;
                                "
                            >
                                🏆
                            </div>


                            <h3>

                                ${
                                    navigator.onLine
                                        ? "No students yet"
                                        : "No saved leaderboard"

                                }

                            </h3>


                            <div class="muted">

                                ${
                                    navigator.onLine

                                        ? "The leaderboard will appear when students join the class."

                                        : "Open the leaderboard while online first so it can be saved for offline use."
                                }

                            </div>

                        </div>

                    `

            }

        </div>

    `;
}
async function renderPage() {

    let html = "";


    /*
    =========================================================
       STUDENT PAGES
    =========================================================
    */

    if (state.role === "student") {

        switch (state.page) {

            case "home":

                html =
                    studentHome();

                break;


            case "begena":

                html =
                    begenaPage();

                break;


            case "tuner":

                html =
                    tunerPage();

                break;


            case "mezmur":

                html =
                    await mezmurPage();

                break;


            case "tutor":

                html =
                    await kfyTutorPage();

                break;


            case "leaderboard":

                html =
                    await leaderboardPage("mentor");

                break;


            case "lessons":

                html =
                    await kfyMentorLessonsPage();

                break;


            case "attendance":

                html =
                    attendancePage();

                break;


            case "assignments":

                html =
                    await assignmentsPage();

                break;


            case "announcements":

                html =
                    await studentAnnouncementsPage();

                break;


            case "certificates":

                html =
                    await certificatesPage();

                break;

            case "account":

                html =
                    accountPage();

                break;


            default:

                state.page =
                    "home";

                html =
                    studentHome();

        }

    }


    /*
    =========================================================
       MENTOR PAGES
    =========================================================
    */

    else {

        switch (state.page) {

            case "dashboard":

                html =
                    mentorDashboard();

                break;


            case "classes":

                html =
                    mentorClassesPage();

                break;


            case "students":

                if (
                    state.mentorClasses?.[0]?.id
                ) {

                    const classId =
                        state.mentorClasses[0].id;


                    await loadMentorAttendanceStudents(
                        classId
                    );


                    await loadMentorStudentProgress(
                        classId
                    );

                }


                html =
                    mentorStudentsPage();

                break;


            case "leaderboard":

                html =
                    await leaderboardPage("mentor");

                break;


            case "attendance":

                await prepareMentorAttendance();

                html =
                    await mentorAttendancePage();

                break;


            case "assignments":

                html =
                    await mentorAssignmentsPage();

                break;


            case "announcements":

                html =
                    announcementsPage();

                break;


            case "lessons":

                html =
                    await kfyMentorLessonsPage();

                break;


            case "mezmur":

                html =
                    await mentorMezmurPage();

                break;


            case "certificates":

                html =
                    mentorCertificatesPage();

                break;

            case "account":

                html =
                    accountPage();

                break;


            default:

                state.page =
                    "dashboard";

                html =
                    mentorDashboard();

        }

    }


    /*
    =========================================================
       RENDER INTO PAGE
    =========================================================
    */

    const container =
        get("page-content");


    if (!container) {

        console.error(
            "❌ #page-content missing"
        );

        return;

    }


    container.innerHTML =
        html;


    bindPageActions();

}


function autoCorrelate(buffer, sampleRate) {

    const SIZE = buffer.length;

    // =========================================
    // REMOVE DC OFFSET
    // =========================================

    let mean = 0;

    for (let i = 0; i < SIZE; i++) {
        mean += buffer[i];
    }

    mean /= SIZE;


    // =========================================
    // CALCULATE RMS
    // =========================================

    let rms = 0;

    for (let i = 0; i < SIZE; i++) {

        const value =
            buffer[i] - mean;

        rms += value * value;

    }

    rms =
        Math.sqrt(
            rms / SIZE
        );


    // Ignore silence / extremely weak signal
    if (rms < 0.002) {
        return -1;
    }


    // =========================================
    // BEGENA FREQUENCY RANGE
    // =========================================

    const minFrequency = 50;
    const maxFrequency = 500;

    const minLag =
        Math.floor(
            sampleRate / maxFrequency
        );

    const maxLag =
        Math.min(
            Math.floor(
                sampleRate / minFrequency
            ),
            SIZE - 2
        );


    // =========================================
    // NORMALIZED AUTOCORRELATION
    // =========================================

    let bestLag = -1;
    let bestCorrelation = 0;

    const correlations = new Float32Array(
        maxLag + 1
    );


    for (
        let lag = minLag;
        lag <= maxLag;
        lag++
    ) {

        let sum = 0;
        let energy1 = 0;
        let energy2 = 0;

        const limit =
            SIZE - lag;


        for (
            let i = 0;
            i < limit;
            i++
        ) {

            const a =
                buffer[i] - mean;

            const b =
                buffer[i + lag] - mean;

            sum += a * b;

            energy1 += a * a;
            energy2 += b * b;

        }


        if (
            energy1 > 0 &&
            energy2 > 0
        ) {

            const correlation =
                sum /
                Math.sqrt(
                    energy1 * energy2
                );

            correlations[lag] =
                correlation;

        }

    }


    // =========================================
    // FIND LOCAL PEAKS
    // =========================================

    const candidates = [];


    for (
        let lag = minLag + 1;
        lag < maxLag - 1;
        lag++
    ) {

        const current =
            correlations[lag];

        const previous =
            correlations[lag - 1];

        const next =
            correlations[lag + 1];


        if (
            current > previous &&
            current >= next &&
            current > 0.25
        ) {

            candidates.push({
                lag,
                correlation: current
            });

        }

    }


    if (!candidates.length) {
        return -1;
    }


    // =========================================
    // CHOOSE THE BEST MUSICAL FUNDAMENTAL
    //
    // Prefer strong correlations, but avoid
    // immediately choosing tiny lags/harmonics.
    // =========================================

    candidates.sort(
        (a, b) =>
            b.correlation -
            a.correlation
    );


    let chosen =
        candidates[0];


    /*
       Check whether a lower-frequency candidate
       is a likely fundamental of the strongest
       candidate.

       This helps prevent harmonic locking.
    */

    for (const candidate of candidates) {

        if (
            candidate.lag >
            chosen.lag * 1.8
        ) {

            if (
                candidate.correlation >=
                chosen.correlation * 0.85
            ) {

                chosen = candidate;
                break;

            }

        }

    }


    let lag = chosen.lag;


    // =========================================
    // PARABOLIC INTERPOLATION
    //
    // Gives better-than-one-bin frequency
    // accuracy.
    // =========================================

    const y1 =
        correlations[lag - 1];

    const y2 =
        correlations[lag];

    const y3 =
        correlations[lag + 1];


    const denominator =
        y1 -
        2 * y2 +
        y3;


    let shift = 0;


    if (
        denominator !== 0 &&
        Number.isFinite(denominator)
    ) {

        shift =
            0.5 *
            (y1 - y3) /
            denominator;

    }


    const refinedLag =
        lag + shift;


    if (
        refinedLag <= 0 ||
        !Number.isFinite(refinedLag)
    ) {

        return -1;

    }


    const frequency =
        sampleRate /
        refinedLag;


    // =========================================
    // FINAL RANGE CHECK
    // =========================================

    if (
        frequency < minFrequency ||
        frequency > maxFrequency
    ) {

        return -1;

    }


    return frequency;
}


async function startMekagna() {

    console.log("🎙️ Starting Mekagna...");

    try {

        if (mekagnaListening) {
            stopMekagna();
            return;
        }


        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            showToast(
                "🎙️ ማይክሮፎን አይደገፍም። localhost ወይም HTTPS ይጠቀሙ።"
            );

            return;
        }


        /* =====================================
           REQUEST MICROPHONE
        ===================================== */

        const stream =
            await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    channelCount: 1
                }
            });


        mekagnaStream = stream;


        /* =====================================
           AUDIO CONTEXT
        ===================================== */

        const AudioContextClass =
            window.AudioContext ||
            window.webkitAudioContext;


        if (!AudioContextClass) {
            throw new Error(
                "Web Audio API is not supported."
            );
        }


        mekagnaAudioContext =
            new AudioContextClass();


        if (
            mekagnaAudioContext.state ===
            "suspended"
        ) {

            await mekagnaAudioContext.resume();

        }


        console.log(
            "🎙️ Audio context:",
            mekagnaAudioContext.state
        );


        /* =====================================
           ANALYSER
        ===================================== */

        mekagnaAnalyser =
            mekagnaAudioContext.createAnalyser();


        mekagnaAnalyser.fftSize = 4096;

        mekagnaAnalyser.smoothingTimeConstant = 0.1;

        mekagnaAnalyser.minDecibels = -90;

        mekagnaAnalyser.maxDecibels = -10;


        /* =====================================
           MICROPHONE SOURCE
        ===================================== */

        mekagnaMicrophone =
            mekagnaAudioContext
                .createMediaStreamSource(
                    mekagnaStream
                );


mekagnaMicrophone.connect(
    mekagnaAnalyser
);

console.log(
    "🔌 MICROPHONE CONNECTED TO ANALYSER"
);

console.log(
    "🎙️ AUDIO TRACK:",
    mekagnaStream.getAudioTracks()[0]
);

console.log(
    "🎙️ TRACK ENABLED:",
    mekagnaStream.getAudioTracks()[0]?.enabled
);

console.log(
    "🎙️ TRACK MUTED:",
    mekagnaStream.getAudioTracks()[0]?.muted
);

console.log(
    "🎙️ AUDIO CONTEXT:",
    mekagnaAudioContext.state
);

console.log(
    "🎙️ SAMPLE RATE:",
    mekagnaAudioContext.sampleRate
);


        /* =====================================
           START LISTENING
        ===================================== */

        mekagnaListening = true;


        const button =
            get("listen-button");


        if (button) {

            button.textContent =
                "⏹️ ማቆም";

        }


        showToast(
            "🎙️ ማዳመጥ ጀምሯል"
        );


        console.log(
            "🎙️ Mekagna is listening."
        );


        detectMekagnaPitch();


    } catch (error) {

        console.error(
            "❌ Mekagna error:",
            error
        );


        mekagnaListening = false;


        if (mekagnaStream) {

            mekagnaStream
                .getTracks()
                .forEach(track => {

                    try {
                        track.stop();
                    } catch (e) {}

                });

            mekagnaStream = null;

        }


        if (mekagnaAudioContext) {

            try {
                await mekagnaAudioContext.close();
            } catch (e) {}

            mekagnaAudioContext = null;

        }


        mekagnaMicrophone = null;
        mekagnaAnalyser = null;
        mekagnaSilentGain = null;


        const button =
            get("listen-button");


        if (button) {

            button.textContent =
                "🎙️ ማዳመጥ";

        }


        if (error.name === "NotAllowedError") {

            showToast(
                "🎙️ የማይክሮፎን ፍቃድ አልተሰጠም።"
            );

        } else if (error.name === "NotFoundError") {

            showToast(
                "🎙️ ማይክሮፎን አልተገኘም።"
            );

        } else {

            showToast(
                `🎙️ ${error.message || "Microphone error."}`
            );

        }

    }

}
function frequencyToNote(frequency) {
    if (
        !Number.isFinite(frequency) ||
        frequency <= 0
    ) {
        return null;
    }

    const noteNames = [
        "C",
        "C#",
        "D",
        "D#",
        "E",
        "F",
        "F#",
        "G",
        "G#",
        "A",
        "A#",
        "B"
    ];

    // MIDI note number
    const midi =
        69 +
        12 *
        Math.log2(
            frequency / 440
        );

    const nearestMidi =
        Math.round(midi);

    const noteIndex =
        ((nearestMidi % 12) + 12) % 12;

    const octave =
        Math.floor(nearestMidi / 12) - 1;

    const targetFrequency =
        440 *
        Math.pow(
            2,
            (nearestMidi - 69) / 12
        );

    const cents =
        1200 *
        Math.log2(
            frequency / targetFrequency
        );

    return {
        note:
            `${noteNames[noteIndex]}${octave}`,

        frequency:
            targetFrequency,

        cents:
            cents
    };
}

function detectMekagnaPitch() {

    if (
        !mekagnaListening ||
        !mekagnaAnalyser ||
        !mekagnaAudioContext
    ) {
        return;
    }

    try {

        const buffer =
            new Float32Array(
                mekagnaAnalyser.fftSize
            );

        mekagnaAnalyser.getFloatTimeDomainData(
            buffer
        );

        // Calculate microphone signal strength
        let peak = 0;
        let sum = 0;

        for (let i = 0; i < buffer.length; i++) {

            const value = Math.abs(buffer[i]);

            if (value > peak) {
                peak = value;
            }

            sum += buffer[i] * buffer[i];
        }

        const rms =
            Math.sqrt(
                sum / buffer.length
            );

        // SHOW SIGNAL LEVEL IN CONSOLE
        console.log(
            "🎙️ SIGNAL:",
            "RMS =", rms.toFixed(6),
            "PEAK =", peak.toFixed(6)
        );

        // Try pitch detection
        const detectedFrequency =
            autoCorrelate(
                buffer,
                mekagnaAudioContext.sampleRate
            );

        console.log(
            "🎵 DETECTED FREQUENCY:",
            detectedFrequency
        );

        if (
            Number.isFinite(detectedFrequency) &&
            detectedFrequency > 0
        ) {

            const noteData =
                frequencyToNote(
                    detectedFrequency
                );

            console.log(
                "🎼 NOTE DATA:",
                noteData
            );

            if (noteData) {

                const noteElement =
                    document.getElementById(
                        "detected-note"
                    );

                const frequencyElement =
                    document.getElementById(
                        "frequency"
                    );

                const centsElement =
                    document.getElementById(
                        "cents"
                    );

                if (noteElement) {
                    noteElement.textContent =
                        noteData.note;
                }

                if (frequencyElement) {
                    frequencyElement.textContent =
                        detectedFrequency.toFixed(2);
                }

                if (centsElement) {

                    const cents =
                        Math.round(
                            Number(noteData.cents)
                        );

                    centsElement.textContent =
                        cents >= 0
                            ? `+${cents}`
                            : `${cents}`;
                }
            }
        }

    } catch (error) {

        console.error(
            "❌ Mekagna detection error:",
            error
        );

    }

    mekagnaAnimationFrame =
        requestAnimationFrame(
            detectMekagnaPitch
        );
}

function stopMekagna() {

    console.log(
        "🛑 Stopping Mekagna..."
    );


    mekagnaListening = false;


    if (mekagnaAnimationFrame) {

        cancelAnimationFrame(
            mekagnaAnimationFrame
        );

        mekagnaAnimationFrame = null;

    }


    if (mekagnaStream) {

        mekagnaStream
            .getTracks()
            .forEach(track => {

                try {
                    track.stop();
                } catch (e) {}

            });

        mekagnaStream = null;

    }


    if (mekagnaMicrophone) {

        try {
            mekagnaMicrophone.disconnect();
        } catch (e) {}

        mekagnaMicrophone = null;

    }


    if (mekagnaAnalyser) {

        try {
            mekagnaAnalyser.disconnect();
        } catch (e) {}

        mekagnaAnalyser = null;

    }


    if (mekagnaSilentGain) {

        try {
            mekagnaSilentGain.disconnect();
        } catch (e) {}

        mekagnaSilentGain = null;

    }


    if (mekagnaAudioContext) {

        try {
            mekagnaAudioContext.close();
        } catch (e) {}

        mekagnaAudioContext = null;

    }


    const button =
        get("listen-button");


    if (button) {

        button.textContent =
            "🎙️ ማዳመጥ";

    }


    console.log(
        "🛑 Mekagna stopped."
    );

}


window.startMekagna =
    startMekagna;

window.stopMekagna =
    stopMekagna;
/* =========================================================
   KFY DATABASE LESSON SYSTEM
   Student Tutor + Mentor Lessons
   ========================================================= */

function kfyEscapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function kfyLineBreaks(value) {
    return kfyEscapeHtml(value).replace(/\n/g, "<br>");
}

function kfyEscapeAttr(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}


/* =========================================================
   LOAD STUDENT LESSONS
   ========================================================= */

async function kfyLoadStudentLessons() {
    if (!supabaseClient || !state.currentClass?.id) {
        return [];
    }

    const { data, error } = await supabaseClient
        .from("lessons")
        .select(`
            id,
            title_am,
            title_en,
            body_am,
            body_en,
            level,
            lesson_number,
            source_note,
            published,
            created_by,
            class_id,
            action_type,
            action_target
        `)
        .eq("class_id", state.currentClass.id)
        .eq("published", true)
        .order("lesson_number", { ascending: true });

    if (error) {
        console.error("❌ Failed to load student lessons:", error);
        showToast("❌ ትምህርቶችን መጫን አልተቻለም");
        return [];
    }

    return data || [];
}


/* =========================================================
   STUDENT TUTOR PAGE
   ========================================================= */

async function kfyTutorPage() {
    const lessons = await kfyLoadStudentLessons();
    const progress = await loadLessonProgress();

    window.kfyTutorLessons = lessons;
    window.kfyTutorProgress = progress;

    const completedCount = lessons.filter(
        lesson => progress[lesson.id] === true
    ).length;

    const totalCount = lessons.length;

    const progressPercent = totalCount > 0
        ? Math.round((completedCount / totalCount) * 100)
        : 0;

    return `
        <div class="card" style="
            margin-bottom:18px;
            overflow:hidden;
            position:relative;
        ">
            <div style="
                display:flex;
                align-items:flex-start;
                justify-content:space-between;
                gap:18px;
                flex-wrap:wrap;
            ">
                <div>
                    <div class="muted" style="margin-bottom:6px;">
                        🎓 Begena Class • Level ${kfyEscapeHtml(
                            state.currentClass?.level ?? 1
                        )}
                    </div>

                    <h2 style="margin:0 0 8px;">
                        በገና ትምህርት
                    </h2>

                    <div class="muted">
                        Learn step by step and keep your progress.
                    </div>
                </div>

                <div class="pill gold">
                    <span id="kfy-tutor-completed-count">
                        ${completedCount}
                    </span>
                    / ${totalCount} Completed
                </div>
            </div>

            <div style="margin-top:20px;">
                <div style="
                    display:flex;
                    justify-content:space-between;
                    gap:12px;
                    margin-bottom:8px;
                    font-size:13px;
                ">
                    <span class="muted">Your progress</span>
                    <b id="kfy-tutor-progress-percent">
                        ${progressPercent}%
                    </b>
                </div>

                <div style="
                    height:10px;
                    border-radius:999px;
                    background:rgba(255,255,255,.08);
                    overflow:hidden;
                ">
                    <div
                        id="kfy-tutor-progress-bar"
                        style="
                            width:${progressPercent}%;
                            height:100%;
                            border-radius:999px;
                            background:linear-gradient(
                                90deg,
                                #d5ad51,
                                #f0cf73
                            );
                            transition:width .25s ease;
                        "
                    ></div>
                </div>
            </div>
        </div>

        <div class="card">
            <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:12px;
                margin-bottom:16px;
                flex-wrap:wrap;
            ">
                <div>
                    <h3 style="margin:0;">
                        📚 Lessons
                    </h3>
                    <div class="muted">
                        Published lessons from your mentor
                    </div>
                </div>

                <span class="pill">
                    ${totalCount} lesson${totalCount === 1 ? "" : "s"}
                </span>
            </div>

            ${
                lessons.length === 0
                    ? `
                        <div style="
                            padding:35px 15px;
                            text-align:center;
                        ">
                            <div style="
                                font-size:42px;
                                margin-bottom:10px;
                            ">
                                📚
                            </div>

                            <h3 style="margin-bottom:8px;">
                                No lessons yet
                            </h3>

                            <div class="muted">
                                Your mentor has not published a lesson yet.
                            </div>
                        </div>
                    `
                    : `
                        <div style="
                            display:grid;
                            gap:12px;
                        ">
                            ${lessons.map((lesson, index) => {
                                const completed =
                                    progress[lesson.id] === true;

                                const number = lesson.lesson_number
                                    ?? (index + 1);

                                return `
                                    <div
                                        class="kfy-lesson-row"
                                        style="
                                            display:flex;
                                            align-items:center;
                                            gap:14px;
                                            padding:15px;
                                            border:1px solid rgba(255,255,255,.08);
                                            border-radius:16px;
                                            background:rgba(255,255,255,.025);
                                        "
                                    >
                                        <div style="
                                            width:42px;
                                            height:42px;
                                            min-width:42px;
                                            border-radius:13px;
                                            display:grid;
                                            place-items:center;
                                            font-weight:900;
                                            background:${
                                                completed
                                                    ? "rgba(65,180,110,.16)"
                                                    : "rgba(213,173,81,.12)"
                                            };
                                        ">
                                            ${
                                                completed
                                                    ? "✓"
                                                    : String(number).padStart(2, "0")
                                            }
                                        </div>

                                        <div style="
                                            flex:1;
                                            min-width:0;
                                        ">
                                            <div style="
                                                font-weight:850;
                                                margin-bottom:4px;
                                            ">
                                                ${kfyEscapeHtml(
                                                    lesson.title_am
                                                )}
                                            </div>

                                            <div class="muted">
                                                ${kfyEscapeHtml(
                                                    lesson.title_en || ""
                                                )}
                                            </div>
                                        </div>

                                        <div style="
                                            display:flex;
                                            align-items:center;
                                            gap:8px;
                                            flex-wrap:wrap;
                                            justify-content:flex-end;
                                        ">
                                            ${
                                                completed
                                                    ? `
                                                        <span class="pill">
                                                            ✅ Completed
                                                        </span>
                                                    `
                                                    : `
                                                        <button
                                                            type="button"
                                                            class="btn primary"
                                                            onclick="kfyOpenTutorLesson('${kfyEscapeAttr(lesson.id)}')"
                                                        >
                                                            ▶️ Start
                                                        </button>
                                                    `
                                            }
                                        </div>
                                    </div>
                                `;
                            }).join("")}
                        </div>
                    `
            }
        </div>

        <div
            id="kfy-tutor-viewer"
            style="margin-top:18px;"
        ></div>
    `;
}


/* =========================================================
   OPEN A STUDENT LESSON
   ========================================================= */
   async function mentorMezmurPage() {
    if (!supabaseClient) {
        return `
            <div class="card">
                <h3>🎵 መዝሙር</h3>
                <p class="muted">Supabase is unavailable.</p>
            </div>
        `;
    }

    let mezmurs = [];

    try {
        const { data, error } = await supabaseClient
            .from("mezmur")
            .select(`
                id,
                title_am,
                title_en,
                lyrics_am,
                meaning_en,
                qenet,
                level,
                audio_path,
                published,
                created_at
            `)
            .order("created_at", {
                ascending: false
            });

        if (error) {
            console.error("❌ Mentor Mezmur loading failed:", error);
        } else {
            mezmurs = data || [];
        }
    } catch (error) {
        console.error("❌ Mentor Mezmur request failed:", error);
    }

    return `
        <div class="page-stack">

            <div class="hero">
                <h2>🎵 መዝሙር አስተዳደር</h2>
                <p>
                    ለተማሪዎች የሚያጠኑባቸውን መዝሙሮች ይጨምሩ።
                </p>
            </div>

            <div class="card">

                <h3>➕ አዲስ መዝሙር ጨምር</h3>

                <form id="add-mezmur-form">

                    <div class="form-grid">

                        <label>
                            የመዝሙር ስም
                            <input
                                id="mezmur-title-am"
                                type="text"
                                placeholder="የመዝሙር ስም"
                                required
                            >
                        </label>

                        <label>
                            English Title
                            <input
                                id="mezmur-title-en"
                                type="text"
                                placeholder="Mezmur title"
                            >
                        </label>

                        <label>
                            ቃላት
                            <textarea
                                id="mezmur-lyrics-am"
                                rows="8"
                                placeholder="የመዝሙሩን ቃላት እዚህ ያስገቡ..."
                            ></textarea>
                        </label>

                        <label>
                            English Meaning
                            <textarea
                                id="mezmur-meaning-en"
                                rows="5"
                                placeholder="English meaning"
                            ></textarea>
                        </label>

                        <label>
                            ቅኔ / Qenet
                            <input
                                id="mezmur-qenet"
                                type="text"
                                placeholder="ለምሳሌ C#"
                            >
                        </label>

                        <label>
                            Level
                            <input
                                id="mezmur-level"
                                type="number"
                                min="1"
                                max="10"
                                placeholder="1"
                            >
                        </label>

                    </div>

                    <button
                        class="btn primary"
                        type="submit"
                    >
                        💾 መዝሙሩን አስቀምጥ
                    </button>

                    <p
                        id="mezmur-form-message"
                        class="muted"
                    ></p>

                </form>

            </div>

            <div class="card">

                <h3>📚 የተጨመሩ መዝሙሮች</h3>

                ${
                    mezmurs.length
                        ? mezmurs.map(mezmur => `
                            <div class="list-item">

                                <div>
                                    <strong>
                                        ${escapeHtml(
                                            mezmur.title_am || "ያልተሰየመ"
                                        )}
                                    </strong>

                                    ${
                                        mezmur.title_en
                                            ? `
                                                <div class="muted">
                                                    ${escapeHtml(
                                                        mezmur.title_en
                                                    )}
                                                </div>
                                            `
                                            : ""
                                    }
                                </div>

                                <div>
                                    ${
                                        mezmur.qenet
                                            ? `
                                                <span class="pill gold">
                                                    🎼 ${escapeHtml(
                                                        mezmur.qenet
                                                    )}
                                                </span>
                                            `
                                            : ""
                                    }

                                    ${
                                        mezmur.level
                                            ? `
                                                <span class="pill">
                                                    Level ${mezmur.level}
                                                </span>
                                            `
                                            : ""
                                    }

                                    <span class="pill ${
                                        mezmur.published
                                            ? "success"
                                            : ""
                                    }">
                                        ${
                                            mezmur.published
                                                ? "Published"
                                                : "Draft"
                                        }
                                    </span>
                                </div>

                            </div>
                        `).join("")
                        : `
                            <div class="empty-state">
                                <div style="font-size:32px;">🎵</div>
                                <h3>ምንም መዝሙር የለም</h3>
                                <p class="muted">
                                    የመጀመሪያውን መዝሙር ከላይ ይጨምሩ።
                                </p>
                            </div>
                        `
                }

            </div>

        </div>
    `;
}

async function kfyOpenTutorLesson(lessonId) {
    const lessons = window.kfyTutorLessons || [];

    const lesson = lessons.find(
        item => item.id === lessonId
    );

    if (!lesson) {
        showToast("❌ ትምህርቱ አልተገኘም");
        return;
    }

    const progress = window.kfyTutorProgress || {};
    const completed = progress[lesson.id] === true;

    const viewer = document.getElementById(
        "kfy-tutor-viewer"
    );

    if (!viewer) {
        return;
    }

    let actionButton = "";

    if (
        lesson.action_type === "begena" &&
        lesson.action_target === "practice"
    ) {
        actionButton = `
            <button
                type="button"
                class="btn primary"
                onclick="kfyStartBegenaFromLesson()"
            >
                🎻 የበገና ልምምድ
            </button>
        `;
    }

    if (lesson.action_type === "mezmur")
         {
        actionButton = `
            <button
                type="button"
                class="btn primary"
                onclick="kfyStartMezmurFromLesson()"
            >
                🎵 ይበላሃላ
            </button>
        `;
    }

    viewer.innerHTML = `
        <div class="card" style="
            border:1px solid rgba(213,173,81,.25);
            overflow:hidden;
        ">
            <div style="
                display:flex;
                align-items:flex-start;
                justify-content:space-between;
                gap:14px;
                flex-wrap:wrap;
                margin-bottom:18px;
            ">
                <div>
                    <div class="muted" style="margin-bottom:6px;">
                        Lesson ${String(
                            lesson.lesson_number ?? ""
                        ).padStart(2, "0")}
                    </div>

                    <h2 style="margin:0 0 6px;">
                        ${kfyEscapeHtml(lesson.title_am)}
                    </h2>

                    ${
                        lesson.title_en
                            ? `
                                <div class="muted">
                                    ${kfyEscapeHtml(lesson.title_en)}
                                </div>
                            `
                            : ""
                    }
                </div>

                <button
                    type="button"
                    class="btn"
                    onclick="kfyCloseTutorLesson()"
                >
                    ✕ Close
                </button>
            </div>

            ${
                lesson.body_am
                    ? `
                        <div style="
                            line-height:1.9;
                            font-size:16px;
                            margin-bottom:18px;
                        ">
                            ${kfyLineBreaks(lesson.body_am)}
                        </div>
                    `
                    : ""
            }

            ${
                lesson.body_en
                    ? `
                        <div style="
                            line-height:1.8;
                            padding-top:15px;
                            margin-top:15px;
                            border-top:1px solid rgba(255,255,255,.08);
                            color:var(--muted);
                        ">
                            ${kfyLineBreaks(lesson.body_en)}
                        </div>
                    `
                    : ""
            }

            ${
                lesson.source_note
                    ? `
                        <div style="
                            margin-top:18px;
                            padding:12px 14px;
                            border-radius:12px;
                            background:rgba(213,173,81,.08);
                            border:1px solid rgba(213,173,81,.15);
                            font-size:13px;
                        ">
                            📖 ${kfyEscapeHtml(lesson.source_note)}
                        </div>
                    `
                    : ""
            }

            <div style="
                margin-top:22px;
                display:flex;
                align-items:center;
                gap:10px;
                flex-wrap:wrap;
            ">
                ${actionButton}

                ${
                    completed
                        ? `
                            <span
                                id="kfy-lesson-complete-status"
                                class="pill gold"
                            >
                                ✅ ተጠናቋል
                            </span>
                        `
                        : `
                            <button
                                type="button"
                                class="btn primary"
                                id="kfy-complete-lesson-button"
                                onclick="kfyCompleteTutorLesson('${kfyEscapeAttr(lesson.id)}')"
                            >
                                ✅ ትምህርቱን ጨርሻለሁ
                            </button>
                        `
                }
            </div>
        </div>
    `;

    viewer.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* =========================================================
   STUDENT LESSON ACTIONS
   ========================================================= */

function kfyCloseTutorLesson() {
    const viewer = document.getElementById(
        "kfy-tutor-viewer"
    );

    if (viewer) {
        viewer.innerHTML = "";
    }
}

async function kfyCompleteTutorLesson(lessonId) {
    const button = document.getElementById(
        "kfy-complete-lesson-button"
    );

    if (button) {
        button.disabled = true;
        button.textContent = "⏳ Saving...";
    }

    const success = await completeLesson(lessonId);

    if (!success) {
        if (button) {
            button.disabled = false;
            button.textContent =
                "✅ ትምህርቱን ጨርሻለሁ";
        }
        return;
    }

    window.kfyTutorProgress = {
        ...(window.kfyTutorProgress || {}),
        [lessonId]: true
    };

    if (button) {
        button.remove();
    }

    const viewer = document.getElementById(
        "kfy-tutor-viewer"
    );

    if (viewer) {
        const actionArea =
            viewer.querySelector(".btn.primary:last-child")
            ?.parentElement;

        if (actionArea) {
            const status = document.createElement("span");
            status.className = "pill gold";
            status.textContent = "✅ ተጠናቋል";
            actionArea.appendChild(status);
        }
    }

    await kfyRefreshTutorProgress();
}


async function kfyRefreshTutorProgress() {
    const lessons = window.kfyTutorLessons || [];

    const progress = await loadLessonProgress();

    window.kfyTutorProgress = progress;

    const completedCount = lessons.filter(
        lesson => progress[lesson.id] === true
    ).length;

    const totalCount = lessons.length;

    const percent = totalCount > 0
        ? Math.round((completedCount / totalCount) * 100)
        : 0;

    const countElement = document.getElementById(
        "kfy-tutor-completed-count"
    );

    const percentElement = document.getElementById(
        "kfy-tutor-progress-percent"
    );

    const barElement = document.getElementById(
        "kfy-tutor-progress-bar"
    );

    if (countElement) {
        countElement.textContent = completedCount;
    }

    if (percentElement) {
        percentElement.textContent = `${percent}%`;
    }

    if (barElement) {
        barElement.style.width = `${percent}%`;
    }

    await kfyReloadTutorLessonList();
}


async function kfyReloadTutorLessonList() {
    const lessons = await kfyLoadStudentLessons();
    const progress = await loadLessonProgress();

    window.kfyTutorLessons = lessons;
    window.kfyTutorProgress = progress;

    const rows = document.querySelectorAll(
        ".kfy-lesson-row"
    );

    if (!rows.length) {
        return;
    }

    const tutorCard =
        document.querySelector(".kfy-lesson-row")?.closest(".card");

    if (!tutorCard) {
        return;
    }

    const container = tutorCard.querySelector(
        "div[style*='display:grid']"
    );

    if (!container) {
        return;
    }

    container.innerHTML = lessons.map((lesson, index) => {
        const completed =
            progress[lesson.id] === true;

        const number = lesson.lesson_number
            ?? (index + 1);

        return `
            <div
                class="kfy-lesson-row"
                style="
                    display:flex;
                    align-items:center;
                    gap:14px;
                    padding:15px;
                    border:1px solid rgba(255,255,255,.08);
                    border-radius:16px;
                    background:rgba(255,255,255,.025);
                "
            >
                <div style="
                    width:42px;
                    height:42px;
                    min-width:42px;
                    border-radius:13px;
                    display:grid;
                    place-items:center;
                    font-weight:900;
                    background:${
                        completed
                            ? "rgba(65,180,110,.16)"
                            : "rgba(213,173,81,.12)"
                    };
                ">
                    ${
                        completed
                            ? "✓"
                            : String(number).padStart(2, "0")
                    }
                </div>

                <div style="
                    flex:1;
                    min-width:0;
                ">
                    <div style="
                        font-weight:850;
                        margin-bottom:4px;
                    ">
                        ${kfyEscapeHtml(lesson.title_am)}
                    </div>

                    <div class="muted">
                        ${kfyEscapeHtml(lesson.title_en || "")}
                    </div>
                </div>

                <div style="
                    display:flex;
                    align-items:center;
                    gap:8px;
                    flex-wrap:wrap;
                    justify-content:flex-end;
                ">
                    ${
                        completed
                            ? `
                                <span class="pill">
                                    ✅ Completed
                                </span>
                            `
                            : `
                                <button
                                    type="button"
                                    class="btn primary"
                                    onclick="kfyOpenTutorLesson('${kfyEscapeAttr(lesson.id)}')"
                                >
                                    ▶️ Start
                                </button>
                            `
                    }
                </div>
            </div>
        `;
    }).join("");
}


async function kfyStartBegenaFromLesson() {
    state.page = "begena";
    await render();
}

async function kfyStartMezmurFromLesson() {
    state.page = "mezmur";
    await render();
}


/* =========================================================
   MENTOR — LOAD LESSONS
   ========================================================= */

async function kfyLoadMentorLessons() {
    if (!supabaseClient || !state.currentClass?.id) {
        return [];
    }

    const { data, error } = await supabaseClient
        .from("lessons")
        .select(`
            id,
            title_am,
            title_en,
            body_am,
            body_en,
            level,
            lesson_number,
            source_note,
            published,
            created_by,
            created_at,
            updated_at,
            class_id,
            action_type,
            action_target
        `)
        .eq("class_id", state.currentClass.id)
        .order("lesson_number", { ascending: true });

    if (error) {
        console.error("❌ Failed to load mentor lessons:", error);
        showToast("❌ ትምህርቶችን መጫን አልተቻለም");
        return [];
    }

    return data || [];
}


/* =========================================================
   MENTOR LESSONS PAGE
   ========================================================= */

async function kfyMentorLessonsPage() {
    const lessons = await kfyLoadMentorLessons();

    window.kfyMentorLessons = lessons;

    return `
        <div class="card" style="
            margin-bottom:18px;
        ">
            <div style="
                display:flex;
                align-items:flex-start;
                justify-content:space-between;
                gap:18px;
                flex-wrap:wrap;
            ">
                <div>
                    <div class="muted" style="margin-bottom:6px;">
                        👨‍🏫 Mentor • ${kfyEscapeHtml(
                            state.currentClass?.name || "Begena Class"
                        )}
                    </div>

                    <h2 style="margin:0 0 7px;">
                        📚 ትምህርቶች
                    </h2>

                    <div class="muted">
                        Create and manage lessons for your students.
                    </div>
                </div>

                <button
                    type="button"
                    class="btn primary"
                    onclick="kfyNewMentorLesson()"
                >
                    ＋ አዲስ ትምህርት
                </button>
            </div>
        </div>

        <div class="card">
            ${
                lessons.length === 0
                    ? `
                        <div style="
                            text-align:center;
                            padding:40px 15px;
                        ">
                            <div style="
                                font-size:44px;
                                margin-bottom:12px;
                            ">
                                📚
                            </div>

                            <h3>
                                No lessons yet
                            </h3>

                            <div class="muted" style="
                                margin-bottom:18px;
                            ">
                                Create your first Begena lesson.
                            </div>

                            <button
                                type="button"
                                class="btn primary"
                                onclick="kfyNewMentorLesson()"
                            >
                                ＋ Create first lesson
                            </button>
                        </div>
                    `
                    : `
                        <div style="
                            display:grid;
                            gap:12px;
                        ">
                            ${lessons.map(lesson => `
                                <div style="
                                    display:flex;
                                    align-items:center;
                                    gap:14px;
                                    padding:16px;
                                    border:1px solid rgba(255,255,255,.08);
                                    border-radius:16px;
                                    background:rgba(255,255,255,.025);
                                ">
                                    <div style="
                                        width:46px;
                                        height:46px;
                                        min-width:46px;
                                        border-radius:14px;
                                        display:grid;
                                        place-items:center;
                                        font-weight:900;
                                        background:rgba(213,173,81,.10);
                                        color:var(--gold);
                                    ">
                                        ${String(
                                            lesson.lesson_number ?? ""
                                        ).padStart(2, "0")}
                                    </div>

                                    <div style="
                                        flex:1;
                                        min-width:0;
                                    ">
                                        <div style="
                                            font-weight:850;
                                            margin-bottom:4px;
                                        ">
                                            ${kfyEscapeHtml(
                                                lesson.title_am
                                            )}
                                        </div>

                                        <div class="muted">
                                            ${kfyEscapeHtml(
                                                lesson.title_en || ""
                                            )}
                                        </div>

                                        <div style="
                                            margin-top:7px;
                                            display:flex;
                                            gap:7px;
                                            flex-wrap:wrap;
                                        ">
                                            ${
                                                lesson.published
                                                    ? `
                                                        <span class="pill gold">
                                                            Published
                                                        </span>
                                                    `
                                                    : `
                                                        <span class="pill">
                                                            Draft
                                                        </span>
                                                    `
                                            }

                                            ${
                                                lesson.action_type !== "lesson"
                                                    ? `
                                                        <span class="pill">
                                                            ${lesson.action_type === "begena"
                                                                ? "🎻 Begena"
                                                                : "🎵 Mezmur"}
                                                        </span>
                                                    `
                                                    : ""
                                            }
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        class="btn"
                                        onclick="kfyEditMentorLesson('${kfyEscapeAttr(lesson.id)}')"
                                    >
                                        ✏️ Edit
                                    </button>
                                </div>
                            `).join("")}
                        </div>
                    `
            }
        </div>

        <div
            id="kfy-mentor-lesson-modal"
            style="
                display:none;
                position:fixed;
                inset:0;
                z-index:2000;
                background:rgba(0,0,0,.72);
                backdrop-filter:blur(7px);
                padding:20px;
                overflow:auto;
            "
        >
            <div style="
                width:min(760px,100%);
                margin:30px auto;
            ">
                <div class="card">
                    <div style="
                        display:flex;
                        align-items:flex-start;
                        justify-content:space-between;
                        gap:14px;
                        margin-bottom:20px;
                    ">
                        <div>
                            <div class="muted">
                                Mentor Lesson Editor
                            </div>

                            <h2
                                id="kfy-mentor-modal-title"
                                style="margin:4px 0 0;"
                            >
                                አዲስ ትምህርት
                            </h2>
                        </div>

                        <button
                            type="button"
                            class="btn"
                            onclick="kfyCloseMentorLessonModal()"
                        >
                            ✕
                        </button>
                    </div>

                    <input
                        type="hidden"
                        id="kfy-lesson-id"
                    />

                    <div class="grid two">
                        <div>
                            <label>Lesson Number</label>
                            <input
                                id="kfy-lesson-number"
                                type="number"
                                min="1"
                                step="1"
                                placeholder="6"
                            />
                        </div>

                        <div>
                            <label>Level</label>
                            <input
                                id="kfy-lesson-level"
                                type="number"
                                min="1"
                                step="1"
                                value="${state.currentClass?.level ?? 1}"
                            />
                        </div>
                    </div>

                    <div style="margin-top:14px;">
                        <label>ርዕስ — Amharic</label>
                        <input
                            id="kfy-lesson-title-am"
                            type="text"
                            placeholder="የአዲሱ ትምህርት ርዕስ"
                        />
                    </div>

                    <div style="margin-top:14px;">
                        <label>Title — English</label>
                        <input
                            id="kfy-lesson-title-en"
                            type="text"
                            placeholder="Lesson title"
                        />
                    </div>

                    <div class="grid two" style="margin-top:14px;">
                        <div>
                            <label>የትምህርቱ ይዘት — Amharic</label>
                            <textarea
                                id="kfy-lesson-body-am"
                                rows="7"
                                placeholder="የትምህርቱን ይዘት እዚህ ይጻፉ..."
                            ></textarea>
                        </div>

                        <div>
                            <label>Lesson content — English</label>
                            <textarea
                                id="kfy-lesson-body-en"
                                rows="7"
                                placeholder="Write the lesson content..."
                            ></textarea>
                        </div>
                    </div>

                    <div style="margin-top:14px;">
                        <label>Source note</label>
                        <input
                            id="kfy-lesson-source-note"
                            type="text"
                            placeholder="Optional source/reference"
                        />
                    </div>

                    <div class="grid two" style="margin-top:14px;">
                        <div>
                            <label>Student action</label>
                            <select id="kfy-lesson-action-type">
                                <option value="lesson">
                                    📖 Normal lesson
                                </option>
                                <option value="begena">
                                    🎻 Open Begena practice
                                </option>
                                <option value="mezmur">
                                    🎵 Open Mezmur
                                </option>
                            </select>
                        </div>

                        <div style="
                            display:flex;
                            align-items:center;
                            padding-top:26px;
                        ">
                            <label style="
                                display:flex;
                                align-items:center;
                                gap:10px;
                                cursor:pointer;
                            ">
                                <input
                                    id="kfy-lesson-published"
                                    type="checkbox"
                                    checked
                                />
                                <span>
                                    Publish this lesson
                                </span>
                            </label>
                        </div>
                    </div>

                    <div style="
                        margin-top:20px;
                        padding-top:18px;
                        border-top:1px solid rgba(255,255,255,.08);
                        display:flex;
                        justify-content:flex-end;
                        gap:10px;
                        flex-wrap:wrap;
                    ">
                        <button
                            type="button"
                            class="btn"
                            onclick="kfyCloseMentorLessonModal()"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            class="btn primary"
                            onclick="kfySaveMentorLesson()"
                        >
                            💾 Save Lesson
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}


/* =========================================================
   MENTOR LESSON MODAL
   ========================================================= */

function kfyGetNextLessonNumber() {
    const lessons = window.kfyMentorLessons || [];

    if (!lessons.length) {
        return 1;
    }

    return Math.max(
        ...lessons.map(
            lesson => Number(lesson.lesson_number) || 0
        )
    ) + 1;
}


function kfyNewMentorLesson() {
    const modal = document.getElementById(
        "kfy-mentor-lesson-modal"
    );

    if (!modal) {
        return;
    }

    document.getElementById(
        "kfy-mentor-modal-title"
    ).textContent = "አዲስ ትምህርት";

    document.getElementById(
        "kfy-lesson-id"
    ).value = "";

    document.getElementById(
        "kfy-lesson-number"
    ).value = kfyGetNextLessonNumber();

    document.getElementById(
        "kfy-lesson-level"
    ).value =
        state.currentClass?.level ?? 1;

    document.getElementById(
        "kfy-lesson-title-am"
    ).value = "";

    document.getElementById(
        "kfy-lesson-title-en"
    ).value = "";

    document.getElementById(
        "kfy-lesson-body-am"
    ).value = "";

    document.getElementById(
        "kfy-lesson-body-en"
    ).value = "";

    document.getElementById(
        "kfy-lesson-source-note"
    ).value = "";

    document.getElementById(
        "kfy-lesson-action-type"
    ).value = "lesson";

    document.getElementById(
        "kfy-lesson-published"
    ).checked = true;

    modal.style.display = "block";
}


function kfyEditMentorLesson(lessonId) {
    const lesson = (window.kfyMentorLessons || []).find(
        item => item.id === lessonId
    );

    if (!lesson) {
        showToast("❌ ትምህርቱ አልተገኘም");
        return;
    }

    const modal = document.getElementById(
        "kfy-mentor-lesson-modal"
    );

    if (!modal) {
        return;
    }

    document.getElementById(
        "kfy-mentor-modal-title"
    ).textContent = "ትምህርት አስተካክል";

    document.getElementById(
        "kfy-lesson-id"
    ).value = lesson.id;

    document.getElementById(
        "kfy-lesson-number"
    ).value =
        lesson.lesson_number ?? "";

    document.getElementById(
        "kfy-lesson-level"
    ).value =
        lesson.level ?? state.currentClass?.level ?? 1;

    document.getElementById(
        "kfy-lesson-title-am"
    ).value =
        lesson.title_am ?? "";

    document.getElementById(
        "kfy-lesson-title-en"
    ).value =
        lesson.title_en ?? "";

    document.getElementById(
        "kfy-lesson-body-am"
    ).value =
        lesson.body_am ?? "";

    document.getElementById(
        "kfy-lesson-body-en"
    ).value =
        lesson.body_en ?? "";

    document.getElementById(
        "kfy-lesson-source-note"
    ).value =
        lesson.source_note ?? "";

    document.getElementById(
        "kfy-lesson-action-type"
    ).value =
        lesson.action_type ?? "lesson";

    document.getElementById(
        "kfy-lesson-published"
    ).checked =
        !!lesson.published;

    modal.style.display = "block";
}


function kfyCloseMentorLessonModal() {
    const modal = document.getElementById(
        "kfy-mentor-lesson-modal"
    );

    if (modal) {
        modal.style.display = "none";
    }
}


/* =========================================================
   SAVE MENTOR LESSON
   ========================================================= */

async function kfySaveMentorLesson() {
    if (!supabaseClient) {
        showToast("❌ Supabase unavailable");
        return;
    }

    const user = window.currentUser;

    if (!user?.id) {
        showToast("❌ Login session not found");
        return;
    }

    const classId = state.mentorClasses?.[0]?.id;

    if (!classId) {
        showToast("❌ Class not found");
        return;
    }

    const lessonId =
        document.getElementById(
            "kfy-lesson-id"
        ).value.trim();

    const lessonNumber = Number(
        document.getElementById(
            "kfy-lesson-number"
        ).value
    );

    const level = Number(
        document.getElementById(
            "kfy-lesson-level"
        ).value
    ) || 1;

    const titleAm =
        document.getElementById(
            "kfy-lesson-title-am"
        ).value.trim();

    const titleEn =
        document.getElementById(
            "kfy-lesson-title-en"
        ).value.trim();

    const bodyAm =
        document.getElementById(
            "kfy-lesson-body-am"
        ).value.trim();

    const bodyEn =
        document.getElementById(
            "kfy-lesson-body-en"
        ).value.trim();

    const sourceNote =
        document.getElementById(
            "kfy-lesson-source-note"
        ).value.trim();

    const actionType =
        document.getElementById(
            "kfy-lesson-action-type"
        ).value;

    const published =
        document.getElementById(
            "kfy-lesson-published"
        ).checked;

    if (!lessonNumber || lessonNumber < 1) {
        showToast("❌ Enter a valid lesson number");
        return;
    }

    if (!titleAm) {
        showToast("❌ የአማርኛ ርዕስ ያስፈልጋል");
        return;
    }

    let actionTarget = null;

    if (actionType === "begena") {
        actionTarget = "practice";
    }

    if (actionType === "mezmur") {
    actionTarget = "mezmur";
}

    const existingLesson =
        lessonId
            ? (window.kfyMentorLessons || []).find(
                lesson => lesson.id === lessonId
            )
            : null;

    const payload = {
        title_am: titleAm,
        title_en: titleEn || null,
        body_am: bodyAm || null,
        body_en: bodyEn || null,
        level,
        lesson_number: lessonNumber,
        source_note: sourceNote || null,
        published,
        class_id: classId,
        action_type: actionType,
        action_target: actionTarget,
        updated_at: new Date().toISOString()
    };

    let error = null;

    if (existingLesson) {
        const result = await supabaseClient
            .from("lessons")
            .update(payload)
            .eq("id", existingLesson.id)
            .eq("class_id", classId);

        error = result.error;
    } else {
        const result = await supabaseClient
            .from("lessons")
            .insert({
                ...payload,
                id: crypto.randomUUID(),
                created_by: user.id
            });

        error = result.error;
    }

    if (error) {
        console.error(
            "❌ Mentor lesson save error:",
            error
        );

        if (error.code === "23505") {
            showToast(
                "❌ That lesson number already exists"
            );
        } else {
            showToast(
                `❌ ${error.message}`
            );
        }

        return;
    }

    showToast(
        existingLesson
            ? "✅ ትምህርቱ ተስተካክሏል"
            : "✅ አዲስ ትምህርት ተፈጥሯል"
    );

    kfyCloseMentorLessonModal();

    await render();
}


/* =========================================================
   KEEP INLINE BUTTONS AVAILABLE
   ========================================================= */

window.kfyOpenTutorLesson = kfyOpenTutorLesson;
window.kfyCloseTutorLesson = kfyCloseTutorLesson;
window.kfyCompleteTutorLesson = kfyCompleteTutorLesson;
window.kfyStartBegenaFromLesson = kfyStartBegenaFromLesson;
window.kfyStartMezmurFromLesson = kfyStartMezmurFromLesson;

window.kfyNewMentorLesson = kfyNewMentorLesson;
window.kfyEditMentorLesson = kfyEditMentorLesson;
window.kfyCloseMentorLessonModal = kfyCloseMentorLessonModal;
window.kfySaveMentorLesson = kfySaveMentorLesson;
/* =========================================================
   ANNOUNCEMENT VOICE RECORDING
========================================================= */

async function startAnnouncementRecording() {

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {
        showToast(
            "❌ የድምፅ ቅጂ በዚህ browser አይደገፍም"
        );
        return;
    }

    try {

        const stream =
            await navigator.mediaDevices.getUserMedia({
                audio: true
            });

        announcementAudioChunks = [];
        announcementAudioBlob = null;

        let mimeType = "";

        if (
            MediaRecorder.isTypeSupported(
                "audio/webm;codecs=opus"
            )
        ) {
            mimeType =
                "audio/webm;codecs=opus";
        } else if (
            MediaRecorder.isTypeSupported(
                "audio/webm"
            )
        ) {
            mimeType =
                "audio/webm";
        }

        announcementRecorder =
            mimeType
                ? new MediaRecorder(
                    stream,
                    { mimeType }
                )
                : new MediaRecorder(stream);

        announcementRecorder.ondataavailable =
            event => {

                if (
                    event.data &&
                    event.data.size > 0
                ) {
                    announcementAudioChunks.push(
                        event.data
                    );
                }

            };

        announcementRecorder.onstop =
            () => {

                announcementAudioBlob =
                    new Blob(
                        announcementAudioChunks,
                        {
                            type:
                                announcementRecorder
                                    ?.mimeType ||
                                "audio/webm"
                        }
                    );

                stream
                    .getTracks()
                    .forEach(
                        track =>
                            track.stop()
                    );

                const startButton =
                    get(
                        "start-announcement-recording"
                    );

                const stopButton =
                    get(
                        "stop-announcement-recording"
                    );

                const status =
                    get(
                        "announcement-recording-status"
                    );

                const preview =
                    get(
                        "announcement-audio-preview"
                    );

                if (startButton) {
                    startButton.disabled =
                        false;
                }

                if (stopButton) {
                    stopButton.disabled =
                        true;
                }

                if (status) {
                    status.textContent =
                        "✅ የድምፅ ቅጂ ዝግጁ ነው";
                }

                if (
                    preview &&
                    announcementAudioBlob
                ) {

                    preview.src =
                        URL.createObjectURL(
                            announcementAudioBlob
                        );

                    preview.style.display =
                        "block";
                }

            };

        announcementRecorder.start();

        const startButton =
            get(
                "start-announcement-recording"
            );

        const stopButton =
            get(
                "stop-announcement-recording"
            );

        const status =
            get(
                "announcement-recording-status"
            );

        if (startButton) {
            startButton.disabled =
                true;
        }

        if (stopButton) {
            stopButton.disabled =
                false;
        }

        if (status) {
            status.textContent =
                "🔴 እየቀረፀ ነው...";
        }

    } catch (error) {

    console.error(
        "❌ ANNOUNCEMENT RECORDING ERROR:",
        error.name,
        error.message,
        error
    );

    showToast(
        `❌ ${error.name || "Recording error"}: ${
            error.message || "Unknown error"
        }`
    );

}
}


function stopAnnouncementRecording() {

    if (
        announcementRecorder &&
        announcementRecorder.state !==
            "inactive"
    ) {

        announcementRecorder.stop();

    }
}
/* =========================================================
   PUBLISH ANNOUNCEMENT
========================================================= */

async function publishAnnouncement() {
    const titleInput = get("announcement-title");
    const messageInput = get("announcement-message");

    const title = titleInput?.value.trim() || "";
    const message = messageInput?.value.trim() || "";

    if (!title) {
        showToast("⚠️ እባክዎ ርዕስ ያስገቡ።");
        return;
    }

    try {
        const {
            data: sessionData,
            error: sessionError
        } = await supabaseClient.auth.getSession();

        if (sessionError) {
            console.error(
                "SESSION ERROR:",
                sessionError
            );

            showToast("❌ Login session error.");
            return;
        }

        const user =
            sessionData?.session?.user;

        if (!user?.id) {
            showToast(
                "❌ እባክዎ እንደገና login ያድርጉ።"
            );
            return;
        }

        const classId =
            state.currentClass?.id ||
            state.mentorClasses?.[0]?.id;

        if (!classId) {
            showToast(
                "❌ Class አልተገኘም።"
            );
            return;
        }

        console.log("📢 PUBLISH DATA:", {
            userId: user.id,
            classId,
            title,
            hasAudio: !!announcementAudioBlob
        });

        const {
            data: announcement,
            error: insertError
        } = await supabaseClient
            .from("announcements")
            .insert({
                title,
                body:
                    message ||
                    (
                        announcementAudioBlob
                            ? "🎙️ Voice announcement"
                            : ""
                    ),
                created_by: user.id,
                target_class_id: classId,
                published: true,
                published_at:
                    new Date().toISOString()
            })
            .select()
            .single();

        if (insertError) {
            console.error(
                "❌ ANNOUNCEMENT INSERT ERROR:",
                insertError
            );

            showToast(
                "❌ " +
                (
                    insertError.message ||
                    "Announcement insert failed."
                )
            );

            return;
        }

        console.log(
            "✅ ANNOUNCEMENT CREATED:",
            announcement
        );

        /*
         * Upload voice recording
         */
        if (announcementAudioBlob) {
            const filePath =
                `${classId}/${announcement.id}.webm`;

            console.log(
                "🎙️ Uploading audio:",
                filePath
            );

            const {
                error: uploadError
            } = await supabaseClient
                .storage
                .from("announcement-audio")
                .upload(
                    filePath,
                    announcementAudioBlob,
                    {
                        contentType:
                            announcementAudioBlob.type ||
                            "audio/webm",
                        upsert: false
                    }
                );

            if (uploadError) {
                console.error(
                    "❌ AUDIO UPLOAD ERROR:",
                    uploadError
                );

                await supabaseClient
                    .from("announcements")
                    .delete()
                    .eq("id", announcement.id);

                showToast(
                    "❌ " +
                    (
                        uploadError.message ||
                        "Voice recording upload failed."
                    )
                );

                return;
            }

            console.log(
                "✅ AUDIO UPLOADED:",
                filePath
            );

            const {
                error: audioPathError
            } = await supabaseClient
                .from("announcements")
                .update({
                    audio_path: filePath
                })
                .eq("id", announcement.id);

            if (audioPathError) {
                console.error(
                    "❌ AUDIO PATH UPDATE ERROR:",
                    audioPathError
                );

                showToast(
                    "⚠️ Announcement created, but audio path could not be saved."
                );

                return;
            }
        }

        /*
         * Reset form
         */
        if (titleInput) {
            titleInput.value = "";
        }

        if (messageInput) {
            messageInput.value = "";
        }

        const announcementAudioPreview =
    get("announcement-audio-preview");

if (announcementAudioPreview) {
    announcementAudioPreview.src = "";
    announcementAudioPreview.style.display = "none";
}

        announcementAudioBlob = null;
        announcementAudioChunks = [];
        announcementRecorder = null;

        const recordingStatus =
            get("announcement-recording-status");

        if (recordingStatus) {
            recordingStatus.textContent =
                "🎙️ ድምጽ ለመቅረጽ ዝግጁ";
        }

        showToast(
            "✅ ማስታወቂያው ተልኳል!"
        );

        await renderPage();

    } catch (error) {
        console.error(
            "❌ PUBLISH ANNOUNCEMENT CRASH:",
            error
        );

        showToast(
            "❌ " +
            (
                error?.message ||
                "Unknown error"
            )
        );
    }
}
function setupTeacherSearch(
    inputId,
    buttonId,
    listSelector
) {

    const input = get(inputId);
    const button = get(buttonId);

    if (!input || !button) {
        return;
    }

    const performSearch = () => {

        const query =
            input.value
                .trim()
                .toLowerCase();

        document
            .querySelectorAll(listSelector)
            .forEach(item => {

                const text =
                    (
                        item.dataset.search ||
                        item.textContent ||
                        ""
                    ).toLowerCase();

                item.style.display =
                    !query || text.includes(query)
                        ? ""
                        : "none";

            });

    };

    button.addEventListener(
        "click",
        performSearch
    );

    input.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                event.preventDefault();

                performSearch();

            }

        }
    );

}
function bindPageActions() {
    setupTeacherSearch(
    "teacher-students-search",
    "teacher-students-search-button",
    "#teacher-students-list .list-item"
);
setupTeacherSearch(
    "teacher-attendance-search",
    "teacher-attendance-search-button",
    "#teacher-attendance-list .list-item"
);
setupTeacherSearch(
    "teacher-leaderboard-search",
    "teacher-leaderboard-search-button",
    "#teacher-leaderboard-list .list-item"
);

    const changePasswordForm = get("change-password-form");

    if (changePasswordForm) {
        changePasswordForm.addEventListener(
            "submit",
            changeAccountPassword
        );
    }

    document
        .querySelectorAll("[data-go]")
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    state.page =
                        button.dataset.go;

                    closeDrawer();

                    await render();

                }
            );

        });


    /* =========================================
       BEGENA STRINGS
    ========================================= */

    document
        .querySelectorAll(".begena-string")
        .forEach(string => {

            string.addEventListener(
                "click",
                () => {

                    const number =
                        Number(
                            string.dataset.string
                        );


                    state.selectedString =
                        number;


                    const output =
                        get("string-name");


                    if (output) {

                        output.textContent =
                            `ገመድ ${number}`;

                    }


                    const preset =
                        state.selectedPreset ||
                        "Selamta";


                    const sound =
                        begenaAudio[
                            preset
                        ]?.[number];


                    if (sound) {

                        try {

                            sound.currentTime = 0;

                            sound.play();

                        } catch (error) {

                            console.warn(
                                "Begena audio playback failed:",
                                error
                            );

                        }

                    }


                    showToast(
                        `🎵 String ${number}`
                    );

                }
            );

        });


    /* =========================================
       BEGENA PRESET
    ========================================= */

    const preset =
        get("preset-select");


    if (preset) {

        preset.value =
            state.selectedPreset;


        preset.addEventListener(
            "change",
            () => {

                state.selectedPreset =
                    preset.value;


                const output =
                    get("preset-name");


                if (output) {

                    output.textContent =
                        state.selectedPreset;

                }


                showToast(
                    `Preset: ${state.selectedPreset}`
                );

            }
        );

    }
    const addMezmurForm = get("add-mezmur-form");

if (addMezmurForm) {
    addMezmurForm.addEventListener("submit", async event => {
        event.preventDefault();

        const message = get("mezmur-form-message");

        const titleAm =
            get("mezmur-title-am")?.value.trim();

        const titleEn =
            get("mezmur-title-en")?.value.trim();

        const lyricsAm =
            get("mezmur-lyrics-am")?.value.trim();

        const meaningEn =
            get("mezmur-meaning-en")?.value.trim();

        const qenet =
            get("mezmur-qenet")?.value.trim();

        const levelValue =
            get("mezmur-level")?.value;

        const level =
            levelValue
                ? Number(levelValue)
                : null;

        if (!titleAm) {
            if (message) {
                message.textContent =
                    "የመዝሙር ስም ያስገቡ።";
            }
            return;
        }

        if (!window.currentUser) {
            if (message) {
                message.textContent =
                    "You must be logged in.";
            }
            return;
        }

        const submitButton =
            addMezmurForm.querySelector(
                'button[type="submit"]'
            );

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent =
                "Saving...";
        }

        try {
            const { error } =
                await supabaseClient
                    .from("mezmur")
                    .insert({
                        title_am: titleAm,
                        title_en: titleEn || null,
                        lyrics_am: lyricsAm || null,
                        meaning_en: meaningEn || null,
                        qenet: qenet || null,
                        level: level,
                        audio_path: null,
                        published: true,
                        created_by: window.currentUser.id
                    });

            if (error) {
                console.error(
                    "❌ Mezmur insert failed:",
                    error
                );

                if (message) {
                    message.textContent =
                        "መዝሙሩን ማስቀመጥ አልተቻለም።";
                }

                return;
            }

            showToast(
                "✅ መዝሙሩ ተጨምሯል!"
            );

            await render();

        } catch (error) {
            console.error(
                "❌ Mezmur save failed:",
                error
            );

            if (message) {
                message.textContent =
                    "Something went wrong.";
            }

        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent =
                    "💾 መዝሙሩን አስቀምጥ";
            }
        }
    });
}

    /* =========================================
       MEKAGNA
    ========================================= */
    document.querySelectorAll("[data-mezmur-id]").forEach(button => {
    button.addEventListener("click", async () => {
        state.selectedMezmurId = button.dataset.mezmurId;
        await render();
    });
});
    const listen =
        get("listen-button");


    if (listen) {

        listen.addEventListener(
            "click",
            async () => {

                if (mekagnaListening) {

                    stopMekagna();

                } else {

                    await startMekagna();

                }

            }
        );

    }


    /* =========================================
       BEGENA PRACTICE MODE
    ========================================= */

    const begenaPracticeButton =
        get("begena-practice-button");


    if (begenaPracticeButton) {

        begenaPracticeButton.addEventListener(
            "click",
            () => {

                const begenaCard =
                    begenaPracticeButton.closest(".grid");


                if (!begenaCard) {
                    return;
                }


                begenaCard.classList.toggle(
                    "begena-practice-mode"
                );


                if (
                    begenaCard.classList.contains(
                        "begena-practice-mode"
                    )
                ) {

                    begenaPracticeButton.textContent =
                        "↩ Normal View";


                    showToast(
                        "🎻 Begena Practice Mode"
                    );

                } else {

                    begenaPracticeButton.textContent =
                        "🎻 Practice Mode";


                    showToast(
                        "↩ Normal View"
                    );

                }

            }
        );

    }


    /* =========================================
       MEZMUR
    ========================================= */

    const playMezmur =
        get("play-mezmur");


    if (playMezmur) {

        playMezmur.addEventListener(
            "click",
            () => {

                const url =
                    activeMezmur.youtubeUrl;


                if (!url) {

                    showToast(
                        "🎧 የYouTube ሊንክ ገና አልተጨመረም"
                    );

                    return;
                }


                window.open(
                    url,
                    "_blank",
                    "noopener,noreferrer"
                );

            }
        );

    }


    const practiceMezmur =
        get("practice-mezmur");


    if (practiceMezmur) {

        practiceMezmur.addEventListener(
            "click",
            async () => {

                state.page =
                    "begena";

                await render();

                showToast(
                    "🎻 የበገና ልምምድ ተከፍቷል"
                );

            }
        );

    }
    /* =========================================
   TUTOR LESSONS
========================================= */

document
    .querySelectorAll(".lesson-button")
    .forEach(button => {

        button.addEventListener(
            "click",
            async () => {

                const lessonId =
                    button.dataset.lessonId;

                if (!lessonId) {
                    return;
                }

                const viewer =
                    get("lesson-viewer");

                if (!viewer) {
                    console.error(
                        "❌ lesson-viewer not found"
                    );
                    return;
                }

                /* =================================
                   REAL SUPABASE LESSON
                ================================= */

                if (
                    supabaseClient &&
                    !["01", "02", "03", "04", "05"]
                        .includes(lessonId)
                ) {

                    const {
                        data: lesson,
                        error
                    } =
                        await supabaseClient
                            .from("lessons")
                            .select(`
                                id,
                                title_am,
                                title_en,
                                body_am,
                                body_en,
                                lesson_number
                            `)
                            .eq(
                                "id",
                                lessonId
                            )
                            .single();

                    if (error || !lesson) {

                        console.error(
                            "❌ Lesson load failed:",
                            error
                        );

                        viewer.innerHTML = `
                            <div
                                class="card"
                                style="margin-top:16px;"
                            >
                                <h3>
                                    ❌ ትምህርቱን መክፈት አልተቻለም
                                </h3>

                                <div class="muted">
                                    Lesson could not be loaded.
                                </div>
                            </div>
                        `;

                        return;
                    }

                    viewer.innerHTML = `
                        <div
                            class="card"
                            style="margin-top:16px;"
                        >

                            <div
                                class="row"
                                style="
                                    justify-content:space-between;
                                    align-items:flex-start;
                                    gap:12px;
                                "
                            >

                                <div>

                                    <span class="pill gold">
                                        Lesson ${lesson.lesson_number ?? ""}
                                    </span>

                                    <h2
                                        style="margin-top:10px;"
                                    >
                                        ${escapeHtml(
                                            lesson.title_am ||
                                            lesson.title_en ||
                                            ""
                                        )}
                                    </h2>

                                    <div class="muted">
                                        ${escapeHtml(
                                            lesson.title_en || ""
                                        )}
                                    </div>

                                </div>

                                <button
                                    type="button"
                                    class="btn"
                                    id="close-lesson"
                                >
                                    ✕
                                </button>

                            </div>

                            <hr
                                style="
                                    border:0;
                                    border-top:
                                    1px solid var(--border);
                                    margin:20px 0;
                                "
                            >

                            <div
                                style="
                                    line-height:1.8;
                                    white-space:pre-wrap;
                                "
                            >
                                ${escapeHtml(
                                    lesson.body_am ||
                                    lesson.body_en ||
                                    ""
                                )}
                            </div>

                            <div style="margin-top:22px;">

                                <button
                                    type="button"
                                    class="btn primary"
                                    id="complete-lesson-button"
                                >
                                    ✅ ትምህርቱን ጨርሻለሁ
                                </button>

                            </div>

                        </div>
                    `;

                    const closeLesson =
                        get("close-lesson");

                    if (closeLesson) {

                        closeLesson.addEventListener(
                            "click",
                            () => {
                                viewer.innerHTML = "";
                            }
                        );

                    }

                    const completeButton =
                        get("complete-lesson-button");

                    if (completeButton) {

                        completeButton.addEventListener(
                            "click",
                            async () => {

                                const done =
                                    await completeLesson(
                                        lesson.id
                                    );

                                if (done) {

                                    completeButton.textContent =
                                        "✅ ተጠናቋል";

                                    completeButton.disabled =
                                        true;

                                }

                            }
                        );

                    }

                    viewer.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                    return;
                }

                /* =================================
                   ORIGINAL FIVE LESSONS
                ================================= */

                const lessons = {

                    "01": {
                        title: "የበገና መግቢያ",
                        subtitle: "Begena Introduction",

                        content: `
                            <h3>🎻 የበገና መግቢያ</h3>

                            <p class="muted">
                                ወደ በገና ትምህርት
                                እንኳን በደህና መጡ።
                            </p>

                            <div
                                class="card"
                                style="margin-top:16px;"
                            >
                                <b>
                                    🎯 የዚህ ትምህርት አላማ
                                </b>

                                <p
                                    class="muted"
                                    style="margin-top:8px;"
                                >
                                    የበገናን ትምህርት
                                    በመሠረታዊ ደረጃ
                                    መጀመር።
                                </p>
                            </div>
                        `
                    },

                    "02": {
                        title: "የበገና ክፍሎች",
                        subtitle: "Parts of Begena",

                        content: `
                            <h3>🪕 የበገና ክፍሎች</h3>

                            <p class="muted">
                                የበገናን አቀማመጥ
                                እና ክፍሎች
                                ተመልከት።
                            </p>
                        `
                    },

                    "03": {
                        title: "10 ገመዶች",
                        subtitle: "The 10 Strings",

                        content: `
                            <h3>🎻 10 ገመዶች</h3>

                            <p class="muted">
                                በገናውን 10 ገመዶች
                                በቁጥር እንለያቸዋለን።
                            </p>

                            <div
                                class="card"
                                style="
                                    margin-top:16px;
                                    text-align:center;
                                "
                            >

                                <div class="muted">
                                    ዋና የልምምድ ገመዶች
                                </div>

                                <div
                                    class="big gold"
                                    style="
                                        margin-top:8px;
                                        font-size:30px;
                                    "
                                >
                                    1 · 4 · 6 · 8 · 10
                                </div>

                            </div>
                        `
                    },

                    "04": {
                        title: "መጫወቻ መሰረቶች",
                        subtitle: "Playing Basics",

                        content: `
                            <h3>🎻 መጫወቻ መሰረቶች</h3>

                            <p class="muted">
                                አሁን ወደ ተግባራዊ
                                ልምምድ እንገባለን።
                            </p>

                            <button
                                type="button"
                                class="btn primary"
                                id="lesson-practice-button"
                                style="margin-top:16px;"
                            >
                                🎻 ወደ በገና ልምምድ
                            </button>
                        `
                    },

                    "05": {
    title: "የመጀመሪያ ዜማ",
    subtitle: "First Mezmur",

    content: `
        <h3>🎵 የመጀመሪያ ዜማ</h3>

        <p class="muted">
            አስተማሪዎ ያከሉትን መዝሙር
            ለማጥናት የመዝሙር ገጹን ይክፈቱ።
        </p>

        <div
            class="card"
            style="
                margin-top:16px;
                text-align:center;
            "
        >

            <div
                class="big gold"
                style="font-size:32px;"
            >
                🎵 መዝሙር
            </div>

            <div
                class="muted"
                style="margin-top:8px;"
            >
                የተጨመሩ መዝሙሮችን ይማሩ
            </div>

            <button
                type="button"
                class="btn primary"
                id="lesson-mezmur-button"
                style="margin-top:16px;"
            >
                🎵 መዝሙሩን ይክፈቱ
            </button>

        </div>
    `
}

                };

                const lesson =
                    lessons[lessonId];

                if (!lesson) {

                    showToast(
                        "❌ ትምህርቱ አልተገኘም"
                    );

                    return;
                }

                viewer.innerHTML = `
                    <div
                        class="card"
                        style="margin-top:16px;"
                    >

                        <div
                            class="row"
                            style="
                                justify-content:space-between;
                                align-items:flex-start;
                                gap:12px;
                            "
                        >

                            <div>

                                <span class="pill gold">
                                    Lesson ${lessonId}
                                </span>

                                <h2
                                    style="margin-top:10px;"
                                >
                                    ${escapeHtml(
                                        lesson.title
                                    )}
                                </h2>

                                <div class="muted">
                                    ${escapeHtml(
                                        lesson.subtitle
                                    )}
                                </div>

                            </div>

                            <button
                                type="button"
                                class="btn"
                                id="close-lesson"
                            >
                                ✕
                            </button>

                        </div>

                        <hr
                            style="
                                border:0;
                                border-top:
                                1px solid var(--border);
                                margin:20px 0;
                            "
                        >

                        ${lesson.content}

                        <div
                            style="
                                margin-top:22px;
                                padding-top:18px;
                                border-top:
                                1px solid var(--border);
                            "
                        >

                            <button
                                type="button"
                                class="btn primary"
                                id="complete-lesson-button"
                            >
                                ✅ ትምህርቱን ጨርሻለሁ
                            </button>

                        </div>

                    </div>
                `;

                const closeLesson =
                    get("close-lesson");

                if (closeLesson) {

                    closeLesson.addEventListener(
                        "click",
                        () => {
                            viewer.innerHTML = "";
                        }
                    );

                }

                const completeButton =
                    get("complete-lesson-button");

                if (completeButton) {

                    completeButton.addEventListener(
                        "click",
                        async () => {

                            const completed =
                                await completeLesson(
                                    lessonId
                                );

                            if (completed) {

                                completeButton.textContent =
                                    "✅ ተጠናቋል";

                                completeButton.disabled =
                                    true;

                            }

                        }
                    );

                }

                const practiceButton =
                    get("lesson-practice-button");

                if (practiceButton) {

                    practiceButton.addEventListener(
                        "click",
                        async () => {

                            state.page =
                                "begena";

                            await render();

                            showToast(
                                "🎻 የበገና ልምምድ ተከፍቷል"
                            );

                        }
                    );

                }

                const mezmurButton =
                    get("lesson-mezmur-button");

                if (mezmurButton) {

                    mezmurButton.addEventListener(
                        "click",
                        async () => {

                            state.page =
                                "mezmur";

                            await render();

                            showToast(
                                "🎵 የመዝሙር ገጽ ተከፍቷል"
                            );

                        }
                    );

                }

                viewer.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }
        );

    });


    /* =========================================
       ATTENDANCE
    ========================================= */

    const saveAttendanceButton =
        get("save-attendance");


    if (saveAttendanceButton) {

        saveAttendanceButton.addEventListener(
            "click",
            saveAttendance
        );

    }


    /* =========================================
   ASSIGNMENT
========================================= */

const publishAssignment =
    get("publish-assignment");

if (publishAssignment) {

    publishAssignment.addEventListener(
        "click",
        async () => {

            const titleInput =
                get("assignment-title");

            const descriptionInput =
                get("assignment-description");

            const title =
                titleInput?.value.trim();

            const description =
                descriptionInput?.value.trim();

            /* -----------------------------
               BASIC VALIDATION
            ----------------------------- */

            if (!title) {

                showToast(
                    "⚠️ የስራውን ርዕስ ያስገቡ"
                );

                titleInput?.focus();

                return;
            }

            if (!description) {

                showToast(
                    "⚠️ የስራውን መመሪያ ያስገቡ"
                );

                descriptionInput?.focus();

                return;
            }

            /* -----------------------------
               AUTH CHECK
            ----------------------------- */

            if (
                !supabaseClient ||
                !window.currentUser
            ) {

                showToast(
                    "❌ እባክዎ መጀመሪያ ይግቡ"
                );

                return;
            }

            /* -----------------------------
               MENTOR CLASS
            ----------------------------- */

            const mentorClass =
                state.mentorClasses?.[0];

            if (!mentorClass?.id) {

                showToast(
                    "❌ ለእርስዎ የተመደበ ክፍል አልተገኘም"
                );

                return;
            }

            /* -----------------------------
               DISABLE BUTTON
            ----------------------------- */

            publishAssignment.disabled =
                true;

            publishAssignment.textContent =
                "⏳ በመላክ ላይ...";

            try {

                /* -----------------------------
                   INSERT ASSIGNMENT
                ----------------------------- */

                const {
                    data,
                    error
                } =
                    await supabaseClient
                        .from("assignments")
                        .insert({
                            title_am:
                                title,

                            instructions_am:
                                description,

                            class_id:
                                mentorClass.id,

                            created_by:
                                window.currentUser.id,

                            status:
                                "published"
                        })
                        .select()
                        .single();

                if (error) {

                    console.error(
                        "❌ Assignment insert failed:",
                        error
                    );

                    throw error;
                }

                console.log(
                    "✅ Assignment created:",
                    data
                );

                /* -----------------------------
                   SUCCESS
                ----------------------------- */

                showToast(
                    "✅ ስራው በተሳካ ሁኔታ ተላክ"
                );

                /* -----------------------------
                   CLEAR FORM
                ----------------------------- */

                if (titleInput) {
                    titleInput.value = "";
                }

                if (descriptionInput) {
                    descriptionInput.value = "";
                }

                /* -----------------------------
                   REFRESH PAGE
                ----------------------------- */

                await render();

            } catch (error) {

                console.error(
                    "❌ Assignment creation failed:",
                    error
                );

                showToast(
                    `❌ ስራውን መላክ አልተቻለም: ${
                        error.message ||
                        "Unknown error"
                    }`
                );

            } finally {

                publishAssignment.disabled =
                    false;

                publishAssignment.textContent =
                    "📤 ላክ";

            }

        }
    );

}

    /* =========================================
       ANNOUNCEMENT
    ========================================= */

const publishAnnouncementButton =
    get("publish-announcement");

if (publishAnnouncementButton) {

    publishAnnouncementButton.addEventListener(
        "click",
        publishAnnouncement
    );

}
const startAnnouncementRecordingButton =
    get(
        "start-announcement-recording"
    );

if (
    startAnnouncementRecordingButton
) {

    startAnnouncementRecordingButton.addEventListener(
        "click",
        startAnnouncementRecording
    );

}


const stopAnnouncementRecordingButton =
    get(
        "stop-announcement-recording"
    );

if (
    stopAnnouncementRecordingButton
) {

    stopAnnouncementRecordingButton.addEventListener(
        "click",
        stopAnnouncementRecording
    );

}


    /* =========================================
       NEW LESSON
    ========================================= */

    const newLesson =
        get("new-lesson");


    if (newLesson) {

        newLesson.addEventListener(
            "click",
            () => {

                showToast(
                    "📚 Lesson editor will connect next."
                );

            }
        );

    }


    /* =========================================
       ADD STUDENT
    ========================================= */

    const addStudentButton =
        get("add-student-button");


    const addStudentModal =
        get("add-student-modal");


    const closeAddStudent =
        get("close-add-student");


    const cancelAddStudent =
        get("cancel-add-student");


    const addStudentForm =
        get("add-student-form");


    const addStudentError =
        get("add-student-error");


    const saveNewStudent =
        get("save-new-student");


    const openAddStudentModal =
        () => {

            if (!addStudentModal) {
                return;
            }

            addStudentModal.style.display =
                "flex";

        };


    const closeAddStudentModal =
        () => {

            if (!addStudentModal) {
                return;
            }

            addStudentModal.style.display =
                "none";

        };


    if (addStudentButton) {

        addStudentButton.addEventListener(
            "click",
            openAddStudentModal
        );

    }


    if (closeAddStudent) {

        closeAddStudent.addEventListener(
            "click",
            closeAddStudentModal
        );

    }


    if (cancelAddStudent) {

        cancelAddStudent.addEventListener(
            "click",
            closeAddStudentModal
        );

    }


    if (addStudentModal) {

        addStudentModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    addStudentModal
                ) {

                    closeAddStudentModal();

                }

            }
        );

    }


    if (addStudentForm) {

        addStudentForm.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const studentId =
                    get("new-student-id")
                        ?.value
                        .trim();


                const fullName =
                    get("new-student-name")
                        ?.value
                        .trim();


                const phone =
                    get("new-student-phone")
                        ?.value
                        .trim();


                const classId =
                    get("new-student-class")
                        ?.value
                        .trim();


                const password =
                    get("new-student-password")
                        ?.value;


                if (
                    !studentId ||
                    !fullName ||
                    !classId ||
                    !password
                ) {

                    if (addStudentError) {

                        addStudentError.style.display =
                            "block";

                        addStudentError.textContent =
                            "⚠️ Please fill all required fields.";

                    }

                    return;

                }


                if (password.length < 6) {

                    if (addStudentError) {

                        addStudentError.style.display =
                            "block";

                        addStudentError.textContent =
                            "⚠️ Password must be at least 6 characters.";

                    }

                    return;

                }


                if (
                    !supabaseClient ||
                    !window.currentUser
                ) {

                    showToast(
                        "❌ You are not authenticated."
                    );

                    return;

                }


                if (saveNewStudent) {

                    saveNewStudent.disabled =
                        true;

                    saveNewStudent.textContent =
                        "Creating...";

                }


                if (addStudentError) {

                    addStudentError.style.display =
                        "none";

                }


                try {

                    const {
                        data,
                        error
                    } =
                        await supabaseClient
                            .functions
                            .invoke(
                                "mentor-add-student",
                                {
                                    body: {

                                        student_id:
                                            studentId,

                                        full_name:
                                            fullName,

                                        phone:
                                            phone,

                                        password:
                                            password,

                                        class_id:
                                            classId

                                    }
                                }
                            );


                    if (error) {

                        console.error(
                            "❌ Add student function failed:",
                            error
                        );

                        throw new Error(
                            error.message ||
                            "Could not create student."
                        );

                    }


                    if (
                        !data ||
                        !data.success
                    ) {

                        throw new Error(
                            data?.error ||
                            "Could not create student."
                        );

                    }


                    showToast(
                        "✅ Student created successfully"
                    );


                    closeAddStudentModal();


                    addStudentForm.reset();


                    await loadMentorAttendanceStudents(
                        classId
                    );


                    await render();

                } catch (error) {

                    console.error(
                        "❌ Add student failed:",
                        error
                    );


                    if (addStudentError) {

                        addStudentError.style.display =
                            "block";

                        addStudentError.textContent =
                            `❌ ${
                                error.message ||
                                "Could not create student."
                            }`;

                    }


                    showToast(
                        "❌ Could not create student."
                    );

                } finally {

                    if (saveNewStudent) {

                        saveNewStudent.disabled =
                            false;

                        saveNewStudent.textContent =
                            "👤 Create Student";

                    }

                }

            }
        );

    }
 const finishCourseButton =
    get("finish-course");

if (finishCourseButton) {
    finishCourseButton.addEventListener(
        "click",
        finishCourse
    );
}
}


/* =========================================================
   ROLE SWITCHING
========================================================= */

function switchRole(role) {

    console.warn(
        "⚠️ Manual role switching is disabled.",
        "Authenticated role:",
        state.role,
        "Requested:",
        role
    );


    updateRoleButtons();

}


function updateRoleButtons() {

    document
        .querySelectorAll(
            ".role-button, .mobile-role-button"
        )
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.role === state.role
            );

        });

}


/* =========================================================
   GENERAL EVENTS
========================================================= */

function setupGeneralEvents() {

// ================================
// LOGOUT
// ================================

const logoutButton = document.getElementById("logout-button");

if (logoutButton) {
    logoutButton.addEventListener("click", async () => {

        if (logoutButton.disabled) {
            return;
        }

        logoutButton.disabled = true;
        logoutButton.textContent = "Logging out...";

        try {

            const { error } =
                await supabaseClient.auth.signOut();
                localStorage.removeItem(
    OFFLINE_STUDENT_KEY
);

            if (error) {
                throw error;
            }

            window.currentUser = null;
            window.currentProfile = null;

            state.currentClass = null;
            state.studentAttendance = [];
            state.mentorClasses = [];

            await showLoginPage();

            logoutButton.disabled = false;
            logoutButton.textContent = "🚪 Logout";

        } catch (error) {

            console.error("❌ Logout failed:", error);

            logoutButton.disabled = false;
            logoutButton.textContent = "🚪 Logout";

            showToast("Logout failed. Please try again.");
        }
    });
}
const mobileLogoutButton =
    document.getElementById("mobile-logout-button");


if (mobileLogoutButton) {

    mobileLogoutButton.addEventListener(
        "click",
        async () => {

            closeDrawer();


            if (mobileLogoutButton.disabled) {
                return;
            }


            mobileLogoutButton.disabled =
                true;

            mobileLogoutButton.innerHTML =
                `<span>Logging out...</span>`;


            try {

                const { error } =
                    await supabaseClient.auth.signOut();
                    localStorage.removeItem(
    OFFLINE_STUDENT_KEY
);


                if (error) {
                    throw error;
                }


                window.currentUser = null;
                window.currentProfile = null;


                state.currentClass = null;
                state.studentAttendance = [];
                state.mentorClasses = [];
                state.mentorAttendanceStudents = [];
                state.mentorAttendanceStatuses = {};


                await showLoginPage();


            } catch (error) {

                console.error(
                    "❌ Mobile logout failed:",
                    error
                );


                mobileLogoutButton.disabled =
                    false;

                mobileLogoutButton.innerHTML =
                    `
                    <span class="logout-icon">↪</span>
                    <span>Logout</span>
                    `;


                showToast(
                    "Logout failed. Please try again."
                );

            }

        }
    );

}
    const menuButton =
        get("menu-button");


    if (menuButton) {

        menuButton.addEventListener(
            "click",
            openDrawer
        );

    }


    const closeButton =
        get("close-drawer");


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeDrawer
        );

    }


    const overlay =
        get("drawer-overlay");


    if (overlay) {

        overlay.addEventListener(
            "click",
            closeDrawer
        );

    }


    const languageButton =
        get("language-button");


    if (languageButton) {

        languageButton.addEventListener(
            "click",
            async () => {

                state.language =
                    state.language === "am"
                        ? "en"
                        : "am";


                languageButton.textContent =
                    state.language === "am"
                        ? "EN"
                        : "አማ";


                if (
                    supabaseClient &&
                    window.currentUser
                ) {

                    try {

                        await supabaseClient
                            .from("profiles")
                            .update({

                                preferred_language:
                                    state.language

                            })
                            .eq(
                                "id",
                                window.currentUser.id
                            );

                    } catch (error) {

                        console.warn(
                            "⚠️ Language update failed:",
                            error
                        );

                    }

                }


                await render();

            }
        );

    }


    const notificationButton =
        get("notification-button");


    if (notificationButton) {

        notificationButton.addEventListener(
            "click",
            () => {

                showToast(
                    "🔔 Notifications will connect to Supabase next."
                );

            }
        );

    }

}


/* =========================================================
   SUPABASE TEST
========================================================= */

async function testSupabase() {

    if (!supabaseClient) {

        return;

    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("begena_presets")
                .select("*")
                .limit(5);


        if (error) {

            console.warn(
                "⚠️ Supabase test query:",
                error.message
            );

            return;

        }


        console.log(
            "✅ Supabase connected",
            data
        );

    } catch (error) {

        console.warn(
            "⚠️ Supabase test failed:",
            error
        );

    }

}


/* =========================================================
   RENDER
========================================================= */

async function render() {

    /* =========================================
       NEVER RENDER WITHOUT A REAL PROFILE
    ========================================= */

    if (
        !window.currentUser ||
        !window.currentProfile
    ) {
        console.warn(
            "⚠️ Render blocked: no authenticated profile"
        );

        return;
    }

    /* =========================================
       ROLE MUST COME FROM PROFILE
    ========================================= */

    const realRole =
        window.currentProfile.role;

    if (
        !["student", "mentor", "admin"]
            .includes(realRole)
    ) {
        console.error(
            "❌ Invalid authenticated role:",
            realRole
        );

        return;
    }

    state.role = realRole;

    /* =========================================
       VALIDATE PAGE
    ========================================= */

    if (state.role === "student") {

        const studentPages = [
            "home",
            "begena",
            "tuner",
            "mezmur",
            "tutor",
            "leaderboard",
            "lessons",
            "attendance",
            "assignments",
            "announcements",
            "certificates",
            "account"
        ];

        if (!studentPages.includes(state.page)) {
            state.page = "home";
        }

    } else {

        const mentorPages = [
    "dashboard",
    "classes",
    "students",
    "leaderboard",
    "attendance",
    "mezmur",
    "assignments",
    "announcements",
    "lessons",
    "certificates",
    "account"
];

        if (!mentorPages.includes(state.page)) {
            state.page = "dashboard";
        }
    }

    console.log(
        "🎨 RENDERING:",
        {
            user: window.currentUser.id,
            profile: window.currentProfile.id,
            role: state.role,
            page: state.page
        }
    );

    renderNavigation();

    renderTitle();

    await renderPage();

    updateRoleButtons();

    updateProfileUI();
}


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setupGeneralEvents();

        setupLogin();

        setupAuthListener();

        await initializeAuth();

        testSupabase();

    }
);
if ("serviceWorker" in navigator) {
    window.addEventListener(
        "load",
        () => {
            navigator.serviceWorker
                .register("./sw.js")
                .then(registration => {
                    console.log(
                        "✅ Service Worker registered:",
                        registration.scope
                    );
                })
                .catch(error => {
                    console.error(
                        "❌ Service Worker registration failed:",
                        error
                    );
                });
        }
    );
}