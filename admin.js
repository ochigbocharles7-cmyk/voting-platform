
const SUPABASE_URL = "https://owkblnzbltqmhtsxukqr.supabase.co";
const SUPABASE_KEY = "sb_publishable_tW7pVe-6JeRx-WltfB32og_KyebSRuy";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ===================================
// ADMIN ELEMENTS
// ===================================

const loginSection = document.getElementById("loginSection");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginButton = document.getElementById("loginButton");

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function showLogin() {
    loginSection.style.display = "block";
    dashboard.style.display = "none";
}

function showDashboard() {
    loginSection.style.display = "none";
    dashboard.style.display = "block";
}

// ===================================
// VERIFY ADMIN
// ===================================

async function verifyAdmin(user) {
    const { data, error } = await supabaseClient
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) throw error;

    return !!data;
}

// ===================================
// DASHBOARD DATA
// ===================================

async function loadDashboard() {

    const [contestantResult, paymentResult] = await Promise.all([

        supabaseClient
            .from("contestants")
            .select("id, name, vote_count")
            .order("vote_count", { ascending: false }),

        supabaseClient
            .from("payments")
            .select("voter_name, amount, votes, payment_status, payment_reference, created_at")
            .order("created_at", { ascending: false })
            .limit(100)

    ]);

    if (contestantResult.error) throw contestantResult.error;
    if (paymentResult.error) throw paymentResult.error;

    const contestants = contestantResult.data || [];
    const payments = paymentResult.data || [];

    const successfulPayments = payments.filter(
        payment => payment.payment_status === "successful"
    );

    const totalRevenue = successfulPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0), 0
    );

    const totalVotes = contestants.reduce(
        (sum, person) => sum + Number(person.vote_count || 0), 0
    );

    document.getElementById("totalRevenue").textContent =
        "₦" + totalRevenue.toLocaleString("en-NG");

    document.getElementById("totalVotes").textContent =
        totalVotes.toLocaleString("en-NG");

    document.getElementById("totalContestants").textContent =
        contestants.length.toLocaleString("en-NG");

    document.getElementById("successfulPayments").textContent =
        successfulPayments.length.toLocaleString("en-NG");

    await loadAdminContestants();

    window.adminPayments = payments;
    displayPayments(payments);
}

// ===================================
// PAYMENT RECORDS
// ===================================

function displayPayments(payments) {

    const table = document.getElementById("paymentsTable");

    table.innerHTML = payments.map(payment => `
        <tr>
            <td>${escapeHTML(payment.voter_name)}</td>
            <td>₦${Number(payment.amount || 0).toLocaleString("en-NG")}</td>
            <td>${Number(payment.votes || 0).toLocaleString("en-NG")}</td>
            <td>${escapeHTML(payment.payment_status)}</td>
            <td>${escapeHTML(payment.payment_reference)}</td>
            <td>${payment.created_at
                ? new Date(payment.created_at).toLocaleString("en-NG")
                : "—"}</td>
        </tr>
    `).join("") || `
        <tr><td colspan="6">No payment records found.</td></tr>
    `;
}

// ===================================
// PAYMENT SEARCH
// ===================================

document.getElementById("paymentSearch").addEventListener("input", event => {

    const search = event.target.value.toLowerCase();

    const filtered = (window.adminPayments || []).filter(payment =>
        String(payment.voter_name || "").toLowerCase().includes(search) ||
        String(payment.payment_reference || "").toLowerCase().includes(search)
    );

    displayPayments(filtered);

});

// ===================================
// ADMIN LOGIN
// ===================================

loginForm.addEventListener("submit", async event => {

    event.preventDefault();

    loginButton.disabled = true;
    loginButton.textContent = "Verifying...";
    loginMessage.textContent = "";

    try {

        const email = document.getElementById("adminEmail").value.trim();
        const password = document.getElementById("adminPassword").value;

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        if (!await verifyAdmin(data.user)) {

            await supabaseClient.auth.signOut();

            throw new Error("This account is not authorised.");
        }

        loginForm.reset();

        showDashboard();

        await loadDashboard();

    } catch (error) {

        console.error(error);

        showLogin();

        loginMessage.textContent =
            error.message || "Unable to load dashboard.";

    } finally {

        loginButton.disabled = false;
        loginButton.textContent = "Login";

    }

});

// ===================================
// LOGOUT
// ===================================

document.getElementById("logoutButton").addEventListener("click", async () => {

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        alert("Unable to log out.");
        return;
    }

    showLogin();

});

// ===================================
// CHECK EXISTING ADMIN SESSION
// ===================================

async function checkAdminSession() {

    showLogin();

    const { data, error } = await supabaseClient.auth.getSession();

    if (error || !data.session) return;

    try {

        if (!await verifyAdmin(data.session.user)) {

            await supabaseClient.auth.signOut();

            loginMessage.textContent = "You are not authorised.";

            return;
        }

        showDashboard();

        await loadDashboard();

    } catch (error) {

        console.error(error);

        showLogin();

        loginMessage.textContent =
            "Unable to load dashboard data.";

    }

}

supabaseClient.auth.onAuthStateChange(event => {

    if (event === "SIGNED_OUT") {
        showLogin();
    }

});

// ===================================
// CONTESTANT MANAGEMENT
// ===================================

const contestantForm = document.getElementById("contestantForm");
const contestantId = document.getElementById("contestantId");
const contestantName = document.getElementById("contestantName");
const contestantCategory = document.getElementById("contestantCategory");
const contestantPhoto = document.getElementById("contestantPhoto");
const saveContestant = document.getElementById("saveContestant");
const cancelEdit = document.getElementById("cancelEdit");

let existingImageUrl = null;

// ===================================
// LOAD CONTESTANTS
// ===================================

async function loadAdminContestants() {

    const { data, error } = await supabaseClient
        .from("contestants")
        .select("id, name, category, image_url, vote_count, is_active")
        .order("id", { ascending: true });

    if (error) {

        console.error(error);

        document.getElementById("adminContestants").textContent =
            "Unable to load contestants.";

        return;
    }

    document.getElementById("adminContestants").innerHTML =
        data.map(person => {

            const isActive = person.is_active !== false;

            return `
                <div class="contestant">

                    <h3>${escapeHTML(person.name)}</h3>

                    <p><strong>Category:</strong>
                        ${escapeHTML(person.category || "Not assigned")}
                    </p>

                    <p>
                        <strong>Status:</strong>
                        <span style="color:${isActive ? "#16803c" : "#b3261e"};">
                            ${isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                    </p>

                    <p>
                        ${Number(person.vote_count || 0).toLocaleString("en-NG")}
                        votes
                    </p>

                    ${person.image_url ? `
                        <img
                            src="${escapeHTML(person.image_url)}"
                            alt="${escapeHTML(person.name)}"
                            style="width:100px;height:100px;object-fit:cover;border-radius:8px;"
                        >
                    ` : ""}

                    <div style="margin-top:15px;display:flex;gap:10px;flex-wrap:wrap;">

                        <button type="button"
                            onclick="editContestant(${Number(person.id)})">
                            Edit
                        </button>

                        <button type="button"
                            onclick="toggleContestantStatus(${Number(person.id)}, ${isActive})"
                            style="background:${isActive ? "#b3261e" : "#16803c"};color:white;">
                            ${isActive ? "Deactivate" : "Activate"}
                        </button>

                    </div>

                </div>
            `;
        }).join("") || "No contestants registered.";

}

// ===================================
// ACTIVATE / DEACTIVATE CONTESTANT
// ===================================

window.toggleContestantStatus = async function(id, currentStatus) {

    const newStatus = !currentStatus;

    const action = newStatus ? "activate" : "deactivate";

    const confirmed = confirm(
        `Are you sure you want to ${action} this contestant?`
    );

    if (!confirmed) return;

    try {

        const { error } = await supabaseClient
            .from("contestants")
            .update({ is_active: newStatus })
            .eq("id", id);

        if (error) throw error;

        alert(
            newStatus
                ? "Contestant activated successfully."
                : "Contestant deactivated successfully."
        );

        await loadDashboard();

    } catch (error) {

        console.error(error);

        alert(error.message || "Unable to update contestant status.");

    }

};

// ===================================
// ADD OR UPDATE CONTESTANT
// ===================================

contestantForm.addEventListener("submit", async event => {

    event.preventDefault();

    saveContestant.disabled = true;
    saveContestant.textContent = "Saving...";

    try {

        const name = contestantName.value.trim();
        const category = contestantCategory.value;

        let image_url = existingImageUrl;

        if (!name) {
            throw new Error("Enter a contestant name.");
        }

        if (!category) {
            throw new Error("Please select a contestant category.");
        }

        const file = contestantPhoto.files[0];

        // UPLOAD NEW PHOTO

        if (file) {

            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp"
            ];

            if (!allowedTypes.includes(file.type)) {
                throw new Error(
                    "Only JPG, PNG and WEBP images are allowed."
                );
            }

            if (file.size > 5 * 1024 * 1024) {
                throw new Error("Image must not exceed 5MB.");
            }

            const safeName = file.name.replace(
                /[^a-zA-Z0-9._-]/g,
                "_"
            );

            const filePath = `${crypto.randomUUID()}-${safeName}`;

            const { error: uploadError } = await supabaseClient
                .storage
                .from("contestant-images")
                .upload(filePath, file, {
                    contentType: file.type,
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data: publicData } = supabaseClient
                .storage
                .from("contestant-images")
                .getPublicUrl(filePath);

            image_url = publicData.publicUrl;

        }

        const contestantData = {
            name,
            category,
            image_url
        };

        let result;

        if (contestantId.value) {

            result = await supabaseClient
                .from("contestants")
                .update(contestantData)
                .eq("id", Number(contestantId.value));

        } else {

            result = await supabaseClient
                .from("contestants")
                .insert(contestantData);

        }

        if (result.error) throw result.error;

        alert("Contestant saved successfully!");

        resetContestantForm();

        await loadDashboard();

    } catch (error) {

        console.error(error);

        alert(error.message || "Unable to save contestant.");

    } finally {

        saveContestant.disabled = false;

        saveContestant.textContent = contestantId.value
            ? "Update Contestant"
            : "Add Contestant";

    }

});

// ===================================
// EDIT CONTESTANT
// ===================================

window.editContestant = async function(id) {

    const { data, error } = await supabaseClient
        .from("contestants")
        .select("id, name, category, image_url")
        .eq("id", id)
        .single();

    if (error) {

        alert("Unable to load contestant.");

        return;
    }

    contestantId.value = data.id;
    contestantName.value = data.name;
    contestantCategory.value = data.category || "";
    contestantPhoto.value = "";

    existingImageUrl = data.image_url || null;

    document.getElementById("contestantFormTitle").textContent =
        "Edit Contestant";

    saveContestant.textContent = "Update Contestant";

    cancelEdit.style.display = "inline-block";

    contestantForm.scrollIntoView({
        behavior: "smooth"
    });

};

// ===================================
// RESET FORM
// ===================================

function resetContestantForm() {

    contestantForm.reset();

    contestantId.value = "";

    existingImageUrl = null;

    document.getElementById("contestantFormTitle").textContent =
        "Add New Contestant";

    saveContestant.textContent = "Add Contestant";

    cancelEdit.style.display = "none";

}

// ===================================
// CANCEL EDIT
// ===================================

cancelEdit.addEventListener("click", resetContestantForm);

// ===================================
// START ADMIN SESSION CHECK
// ===================================

checkAdminSession();
