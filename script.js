
const SUPABASE_URL = "https://owkblnzbltqmhtsxukqr.supabase.co";
const SUPABASE_KEY = "sb_publishable_tW7pVe-6JeRx-WltfB32og_KyebSRuy";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const container = document.getElementById("contestants");

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// ===================================
// LOAD ACTIVE CONTESTANTS BY CATEGORY
// ===================================

async function loadContestants() {

    const categories = [
        "KING OF FEZOTECH",
        "QUEEN OF FEZOTECH",
        "MOST SOCIAL STAFF",
        "MOST POPULAR",
        "MOST INFLUENTIAL",
        "MOST STYLISH",
        "MOST HANDSOME",
        "MOST BEAUTIFUL"
    ];

    const { data, error } = await supabaseClient
        .from("contestants")
        .select("id, name, image_url, category")
        .eq("is_active", true)
        .order("id", { ascending: true });

    if (error) {
        container.textContent = "Unable to load contestants.";
        console.error(error);
        return;
    }

    const contestants = data || [];

    const populatedCategories = categories
        .map(category => ({
            name: category,
            contestants: contestants.filter(
                person => person.category === category
            )
        }))
        .filter(group => group.contestants.length > 0);

    if (populatedCategories.length === 0) {
        container.innerHTML = `
            <div class="contestants-empty">
                <span>✦</span>
                <h3>No Contestants Available Yet</h3>
                <p>Please check back later for registered contestants.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = populatedCategories.map((group, index) => {

        return `
            <section class="category-section">

                <div class="category-heading">

                    <div class="category-heading-main">

                        <span class="category-number">
                            ${String(index + 1).padStart(2, "0")}
                        </span>

                        <div>
                            <p class="category-eyebrow">AWARD CATEGORY</p>
                            <h2>${escapeHTML(group.name)}</h2>
                        </div>

                    </div>

                    <span class="category-count">
                        ${group.contestants.length}
                        ${group.contestants.length === 1 ? "CONTESTANT" : "CONTESTANTS"}
                    </span>

                </div>


                <div class="category-contestants">

                    ${group.contestants.map(person => {

                        const initials = escapeHTML(
                            person.name
                                .trim()
                                .split(/\s+/)
                                .slice(0, 2)
                                .map(part => part.charAt(0))
                                .join("")
                                .toUpperCase()
                        );

                        return `
                            <article class="contestant">

                                <div class="contestant-photo">

                                    ${person.image_url ? `
                                        <img
                                            src="${escapeHTML(person.image_url)}"
                                            alt="${escapeHTML(person.name)}"
                                            loading="lazy"
                                        >
                                    ` : `
                                        <div class="contestant-placeholder">
                                            ${initials}
                                        </div>
                                    `}

                                    <span class="contestant-photo-overlay"></span>

                                </div>


                                <div class="contestant-details">

                                    <h3>${escapeHTML(person.name)}</h3>

                                    <p>Support this contestant</p>

                                    <button
                                        class="vote-button"
                                        data-id="${escapeHTML(person.id)}"
                                        data-name="${escapeHTML(person.name)}"
                                    >
                                        Vote Now
                                        <span>→</span>
                                    </button>

                                </div>

                            </article>
                        `;

                    }).join("")}

                </div>

            </section>
        `;

    }).join("");

}

// ===================================
// CREATE PAYMENT FORM
// ===================================

const modal = document.createElement("div");

modal.id = "voteModal";
modal.style.cssText = `
    display:none;
    position:fixed;
    inset:0;
    background:#000000dd;
    z-index:9999;
    justify-content:center;
    align-items:center;
    padding:20px;
`;

modal.innerHTML = `
    <div style="
        background:#151515;
        border:1px solid #d4af37;
        border-radius:12px;
        padding:25px;
        width:100%;
        max-width:420px;
        color:white;
    ">
        <h2 style="color:#d4af37;margin-bottom:10px;">Cast Your Vote</h2>

        <p id="selectedContestant" style="margin-bottom:20px;"></p>

        <form id="voteForm">

            <input name="voter_name" placeholder="Your full name"
                required style="width:100%;padding:12px;margin-bottom:12px;">

            <input name="email" type="email" placeholder="Email address (Required)"
                required style="width:100%;padding:12px;margin-bottom:12px;">

            <input name="phone" type="tel" placeholder="Phone number (Optional)"
                style="width:100%;padding:12px;margin-bottom:12px;">

            <input name="amount" type="number" min="100" step="100"
                placeholder="Amount (₦)" required
                style="width:100%;padding:12px;margin-bottom:12px;">

            <button type="submit" id="payButton"
                style="width:100%;padding:13px;background:#d4af37;
                border:0;border-radius:6px;font-weight:bold;cursor:pointer;">
                Pay Now
            </button>

            <button type="button" id="closeModal"
                style="width:100%;padding:12px;margin-top:10px;
                background:#333;color:white;border:0;border-radius:6px;">
                Cancel
            </button>

        </form>

        <div id="paymentResult" style="margin-top:20px;"></div>
    </div>
`;

document.body.appendChild(modal);

let selectedContestantId = null;

// ===================================
// VOTE BUTTON
// ===================================

container.addEventListener("click", event => {

    const button = event.target.closest(".vote-button");

    if (!button) return;

    selectedContestantId = Number(button.dataset.id);

    document.getElementById("selectedContestant").textContent =
        "Voting for: " + button.dataset.name;

    document.getElementById("paymentResult").innerHTML = "";

    document.getElementById("voteModal").style.display = "flex";

});
// ===================================
// CLOSE MODAL AND RESET VOTING FORM
// ===================================

document.getElementById("closeModal").addEventListener("click", () => {

    modal.style.display = "none";

    document.getElementById("voteForm").reset();

    document.getElementById("paymentResult").innerHTML = "";

    const payButton = document.getElementById("payButton");

    payButton.style.display = "block";
    payButton.disabled = false;
    payButton.textContent = "Pay Now";

    selectedContestantId = null;

});

// ===================================
// PAYMENT PROCESSING
// ===================================

document.getElementById("voteForm").addEventListener("submit", async event => {

    event.preventDefault();

    const form = event.target;
    const button = document.getElementById("payButton");
    const result = document.getElementById("paymentResult");

    const amount = Number(form.amount.value);

    if (!Number.isInteger(amount) || amount < 100 || amount % 100 !== 0) {
        result.textContent = "Enter an amount of at least ₦100 in multiples of ₦100.";
        return;
    }

    button.disabled = true;
    button.textContent = "Generating account...";
    result.textContent = "Please wait while we prepare your payment details.";

    try {

        const { data, error } = await supabaseClient.functions.invoke(
            "create-payment",
            {
                body: {
                    contestant_id: selectedContestantId,
                    voter_name: form.voter_name.value.trim(),
                    email: form.email.value.trim(),
                    phone: form.phone.value.trim(),
                    amount
                }
            }
        );

        if (error) throw error;

        if (!data || !data.success) {
            throw new Error(data?.error || "Unable to generate payment details.");
        }

        result.innerHTML = `
            <h3 style="color:#d4af37;">Transfer Details</h3>
            <p>Bank: ${escapeHTML(data.bank_name)}</p>
            <p>Account Number: <strong>${escapeHTML(data.account_number)}</strong></p>
            <p>Amount: ₦${Number(data.amount).toLocaleString()}</p>
            <p>Reference: ${escapeHTML(data.payment_reference)}</p>
            <p>Expiry: ${escapeHTML(data.expiry_date)}</p>
            <p style="color:#d4af37;margin-top:12px;">
                Complete your bank transfer. Your votes will be credited after payment verification.
            </p>
        `;

        button.style.display = "none";

        // AUTOMATICALLY CHECK PAYMENT STATUS

        (async () => {

            const paymentReference = data.payment_reference;
            const maxChecks = 180;

            for (let i = 0; i < maxChecks; i++) {

                await new Promise(resolve => setTimeout(resolve, 10000));

                try {

                    const { data: statusData, error: statusError } =
                        await supabaseClient.functions.invoke(
                            "check-payment-status",
                            {
                                body: {
                                    payment_reference: paymentReference
                                }
                            }
                        );

                    if (statusError) {
                        console.warn("Payment status check failed:", statusError);
                        continue;
                    }

                    if (
                        statusData?.success &&
                        statusData.payment_status === "successful" &&
                        statusData.credited === true
                    ) {

                        result.innerHTML = `
                            <h3 style="color:#d4af37;">Payment Successful!</h3>
                            <p>Your payment has been confirmed.</p>
                            <p>Your votes have been credited to your selected contestant.</p>
                        `;

                        return;
                    }

                } catch (statusError) {

                    console.error("Payment status check failed:", statusError);

                }

            }

            result.insertAdjacentHTML(
                "beforeend",
                "<p>Payment is still being processed. Please check again shortly.</p>"
            );

        })();

    } catch (error) {

        console.error("Payment error:", error);

        result.textContent = error.message ||
            "Payment could not be initiated. Please try again.";

        button.style.display = "block";

    } finally {

        button.disabled = false;

        if (button.style.display !== "none") {
            button.textContent = "Pay Now";
        }

    }

});

// ===================================
// START WEBSITE
// ===================================

loadContestants();
