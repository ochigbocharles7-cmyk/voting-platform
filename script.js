
const SUPABASE_URL = "https://owkblnzbltqmhtsxukqr.supabase.co";
const SUPABASE_KEY = "sb_publishable_tW7pVe-6JeRx-WltfB32og_KyebSRuy";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

async function loadContestants() {
    const container = document.getElementById("contestants");

   const { data, error } = await supabaseClient
    .from("contestants")
    .select("id, name, image_url")
    .order("id", { ascending: true });

    if (error) {
        container.innerHTML = "Unable to load contestants.";
        console.error("Supabase error:", error);
        return;
    }

    container.innerHTML = data.map(person => `
        <div class="contestant">
            <h3>${person.name}</h3>
            <p>Support this contestant</p>
        </div>
    `).join("");
}

loadContestants();
