const pluralS = new Set([
    "abs", "abstracts", "academics", "accepts", "accidents", "accommodations",
    "accounts", "achievements", "acids", "acquisitions", "acres", "actions",
    "actors", "acts", "adams", "adapters", "additions", "adds", "adjustments",
    "administrators", "admissions", "ads", "adults", "advances", "advantages",
    "adventures", "advertisements", "advertisers", "advisors", "affairs",
    "affects", "affiliates", "agents", "ages", "agreements", "agrees", "aids",
    "aims", "airlines", "airports", "albums", "alerts", "algorithms",
    "allows", "alternatives", "amendments", "americans", "americas",
    "amounts", "analysts", "andreas", "andrews", "angels", "animals",
    "announcements", "announces", "answers", "antiques", "apartments",
    "appeals", "appears", "appliances", "applicants", "applications",
    "appointments", "apps", "architects", "archives", "areas", "arguments",
    "arms", "arrangements", "arrivals", "arrives", "articles", "artists",
    "arts", "asks", "aspects", "ass", "assessments", "assets", "assignments",
    "assists", "associates", "associations", "assumes", "assumptions",
    "athletics", "attachments", "attacks", "attempts", "attitudes",
    "attorneys", "attractions", "attributes", "auctions", "aus", "authors",
    "automobiles", "autos", "awards", "babes", "backgrounds", "bags", "balls",
    "bands", "banks", "banners", "bargains", "barriers", "bars", "bases",
    "basics", "baskets", "bathrooms", "baths", "bbs", "beans", "bears",
    "beats", "becomes", "bedrooms", "beds", "beginners", "begins", "beings",
    "beliefs", "believes", "belongs", "belts", "benefits", "besides",
    "beverages", "bids", "bikes", "bills", "bios", "birds", "bits", "blacks",
    "blades", "blocks", "bloggers", "blogs", "blowjobs", "blues", "boards",
    "boats", "bonds", "bones", "bookings", "bookmarks", "books",
    "boots", "borders", "bottles", "boys", "bracelets", "brakes", "brands",
    "bras", "brass", "breaks", "breasts", "breeds", "bridges", "briefs",
    "brings", "brochures", "brokers", "brooks", "brothers", "browsers",
    "bucks", "budgets", "bugs", "builders", "buildings", "builds", "burns",
    "buttons", "butts", "buyers", "buys", "bytes", "cabinets", "cables",
    "cakes", "calculations", "calculators", "calendars", "calls",
    "camcorders", "cameras", "campaigns", "camps", "cams", "candidates",
    "candles", "caps", "cards", "careers", "carlos", "carriers", "cars",
    "cartoons", "cartridges", "cases", "casinos", "catalogs", "cats",
    "causes", "cbs", "cds", "cells", "centers", "centres", "cents",
    "certificates", "chains", "chairs", "challenges", "chambers", "champions",
    "championships", "chances", "changes", "channels", "chapters",
    "characteristics", "characters", "chargers", "charges", "charms",
    "charts", "cheats", "checks", "chemicals", "chicks", "childrens", "chips",
    "choices", "christians", "chronicles", "cigarettes", "circles",
    "circuits", "citations", "citizens", "claims", "classics", "classifieds",
    "cleaners", "clicks", "clients", "clinics", "clips", "clocks", "closes",
    "clouds", "clubs", "clusters", "cms", "cocks", "codes", "coins",
    "colleagues", "collectibles", "collections", "collectors", "colleges",
    "colors", "colours", "columns", "combinations", "combines", "comes",
    "comics", "commands", "comments", "commissioners", "commissions",
    "commitments", "committees", "commons", "communications", "comparisons",
    "competitions", "complaints", "components", "compounds", "computers",
    "concentrations", "concepts", "concerns", "concerts", "conclusions",
    "conditions", "condos", "conferences", "conflicts", "connections",
    "connectors", "cons", "consequences", "considerations", "considers",
    "consists", "consoles", "constitutes", "constraints", "consultants",
    "consumers", "contacts", "containers", "contains", "contents", "contests",
    "continues", "contractors", "contracts", "contributions", "contributors",
    "controllers", "controls", "conventions", "conversations", "cookies",
    "coordinates", "copyrights", "corners", "corporations", "corps",
    "corrections", "cos", "cosmetics", "costs", "costumes", "cottages",
    "councils", "counters", "counts", "couples", "coupons", "courses",
    "courts", "covers", "crafts", "craps", "creates", "creations",
    "creatures", "credits", "crimes", "crops", "cruises", "css", "cultures",
    "cumshots", "cups", "curves", "customers", "customs", "cuts", "cvs",
    "cycles", "damages", "dans", "das", "databases", "dates", "daughters",
    "days", "dealers", "deals", "deaths", "decades", "decisions", "defines",
    "definitions", "degrees", "delays", "delivers", "demands", "democrats",
    "demonstrates", "departments", "depends", "deposits", "des", "describes",
    "descriptions", "designers", "designs", "desktops", "destinations",
    "details", "determines", "developers", "developments", "develops",
    "devices", "diamonds", "dicks", "dies", "differences", "diffs", "dildos",
    "dimensions", "directions", "directors", "dis", "disciplines",
    "disclaimers", "discounts", "discs", "discussions", "diseases", "disks",
    "disorders", "displays", "disputes", "distances", "distributions",
    "distributors", "districts", "divisions", "docs", "doctors", "documents",
    "does", "dogs", "dollars", "dolls", "domains", "donations", "donors",
    "doors", "dos", "downloads", "dozens", "drawings", "draws", "dreams",
    "drinks", "drivers", "drives", "drops", "drugs", "drums", "dts", "dvds",
    "dynamics", "eagles", "earnings", "ears", "ebooks", "economics", "edges",
    "editions", "editorials", "editors", "eds", "edwards", "effects",
    "efforts", "eggs", "elections", "electronics", "elements", "emails",
    "emissions", "employees", "employers", "enables", "encourages", "ends",
    "engineers", "engines", "enhancements", "ensures", "enterprises",
    "enters", "entrepreneurs", "environments", "episodes", "equations",
    "errors", "escorts", "essays", "essentials", "estates", "estimates",
    "euros", "evaluations", "events", "examinations", "examines", "examples",
    "exams", "exceptions", "exchanges", "executives", "exercises",
    "exhibitions", "exhibits", "exists", "expects", "expenditures",
    "expenses", "experiences", "experiments", "experts", "explains",
    "exports", "expressions", "extends", "extensions", "extras", "eyes",
    "fabrics", "faces", "factors", "facts", "fails", "failures", "falls",
    "fans", "faqs", "fares", "farmers", "farms", "fathers", "favorites",
    "favors", "favourites", "fears", "features", "feeds", "feelings", "feels",
    "fees", "females", "festivals", "fields", "fighters", "figures", "files",
    "films", "filters", "finals", "finances", "findings", "finds", "fingers",
    "fires", "firms", "fits", "flags", "flights", "floors", "florists",
    "flowers", "flows", "folders", "folks", "follows", "fonts", "foods",
    "forces", "forecasts", "forests", "formats", "forms", "forums", "fotos",
    "foundations", "fragrances", "frames", "friends", "fruits", "functions",
    "fundamentals", "funds", "futures", "gains", "games", "gaps", "gardens",
    "gas", "gates", "gays", "generates", "generations", "generators", "genes",
    "genetics", "genres", "gets", "giants", "gifts", "girls", "gis", "gives",
    "goals", "gods", "goods", "governments", "gps", "grades", "graduates",
    "grants", "graphics", "graphs", "grass", "greetings", "grounds", "groups",
    "grows", "guarantees", "guards", "guests", "guides", "guitars", "guns",
    "guys", "handhelds", "handjobs", "handles", "hands", "happens", "has",
    "hats", "hazards", "headers", "headlines", "heads", "hearings", "hearts",
    "heights", "helps", "herbs", "highlights", "highs", "highways", "hills",
    "hints", "his", "hits", "holders", "holdings", "holds", "holes",
    "holidays", "homes", "honors", "hopes", "horses", "hospitals", "hostels",
    "hosts", "hotels", "hours", "households", "houses", "hrs", "humans",
    "hundreds", "icons", "ideas", "ids", "illustrations", "images", "impacts",
    "imports", "improvements", "incentives", "incidents", "includes",
    "increases", "indians", "indicates", "indicators", "individuals",
    "infants", "infections", "influences", "initiatives", "innovations",
    "inns", "inputs", "ins", "insights", "inspections", "installations",
    "instances", "institutes", "institutions", "instructions", "instructors",
    "instruments", "interactions", "interests", "interfaces", "intervals",
    "interventions", "interviews", "introduces", "investigations",
    "investigators", "investments", "investors", "invitations", "involves",
    "ips", "irs", "islands", "issues", "items", "its", "jackets", "jeans",
    "jets", "jobs", "johns", "joins", "jokes", "journalists", "journals",
    "judges", "keeps", "keyboards", "keys", "keywords", "kids", "kills",
    "kinds", "kings", "kits", "knights", "knows", "labels", "labs", "lakes",
    "lamps", "lands", "landscapes", "lanes", "languages", "laptops",
    "latinas", "laws", "lawyers", "layers", "lbs", "leaders", "leads",
    "leaves", "lectures", "legends", "legs", "lenders", "lens", "les",
    "lesbians", "less", "lessons", "lets", "letters", "levels", "libs",
    "licenses", "lies", "lights", "likes", "limitations", "limits", "lines",
    "links", "lions", "lips", "listings", "lists", "lives", "loads", "loans",
    "locations", "locks", "logos", "logs", "looks", "loops", "loss",
    "lots", "lovers", "loves", "lows", "lyrics", "machines", "magazines",
    "mails", "maintains", "makers", "makes", "males", "managers", "manuals",
    "manufacturers", "maps", "markers", "markets", "marks", "mars", "mas",
    "mass", "masters", "materials", "mats", "matters", "meals", "means",
    "measurements", "measures", "mechanisms", "medications", "medicines",
    "meetings", "meets", "members", "mens", "menus", "merchants", "messages",
    "metals", "meters", "methods", "miles", "millions", "mills",
    "minds", "minerals", "mines", "ministers", "mins", "minutes", "mirrors",
    "missions", "mistakes", "mls", "mobiles", "models", "modems",
    "moderators", "modes", "modifications", "mods", "modules", "moments",
    "moms", "monitors", "months", "mortgages", "motels", "mothers",
    "motorcycles", "motors", "mountains", "mounts", "movements", "moves",
    "movies", "mpegs", "mrs", "muscles", "museums", "musicians", "muslims",
    "nails", "names", "nations", "naturals", "needs", "negotiations",
    "neighbors", "networks", "news", "newsletters", "newspapers", "nhs",
    "nights", "nipples", "nodes", "nominations", "nos", "notebooks", "notes",
    "notices", "notifications", "novels", "numbers", "nurses", "nuts", "oaks",
    "objectives", "objects", "obligations", "observations", "occasions",
    "occupations", "occurs", "odds", "offerings", "offers", "officers",
    "offices", "officials", "oils", "olympics", "ones", "ons", "openings",
    "opens", "operates", "operations", "operators", "opinions", "opponents",
    "options", "orders", "organisations", "organizations", "origins",
    "others", "ours", "outcomes", "outdoors", "outputs", "owners", "owns",
    "packages", "packets", "packs", "pads", "pages", "paintings", "pairs",
    "panels", "paperbacks", "papers", "paragraphs", "parameters", "parents",
    "parks", "participants", "particles", "partners", "partnerships", "parts",
    "pas", "pass", "passengers", "passwords", "patents", "paths", "patients",
    "patterns", "payments", "pays", "pcs", "pdas", "peers", "pens",
    "pensions", "peoples", "performances", "performs", "periods",
    "peripherals", "permissions", "permits", "personals", "persons",
    "perspectives", "pets", "pharmaceuticals", "phases", "philips", "phones",
    "photographers", "photographs", "photos", "phrases", "physicians",
    "picks", "pics", "pictures", "pieces", "pills", "pins", "pipes", "pixels",
    "places", "plains", "planes", "planets", "planners", "plans", "plants",
    "plastics", "plates", "platforms", "players", "plays", "plots", "plugins",
    "pockets", "podcasts", "poems", "points", "polls", "pools", "populations",
    "portions", "portraits", "ports", "pos", "positions", "postcards",
    "posters", "postings", "posts", "pounds", "powers", "practices",
    "practitioners", "prayers", "predictions", "preferences", "prefers",
    "presentations", "presents", "previews", "prices", "principles",
    "printers", "prints", "prisoners", "privileges", "prizes", "problems",
    "procedures", "proceedings", "proceeds", "processors", "producers",
    "produces", "productions", "products", "professionals", "profiles",
    "profits", "programmers", "programmes", "programs", "projectors",
    "projects", "promises", "promotes", "promotions", "proposals", "pros",
    "prospects", "proteins", "protocols", "providers", "provides",
    "provinces", "provisions", "pts", "publications", "publishers", "pubs",
    "pumps", "purchases", "purposes", "puts", "puzzles", "qualifications",
    "quarters", "queens", "questions", "quotes", "races", "racks", "radios",
    "raises", "ranges", "rankings", "ranks", "rapids", "rates", "ratings",
    "ratios", "rats", "rays", "reactions", "readers", "readings", "reads",
    "realtors", "reasons", "rebates", "receivers", "receives", "receptors",
    "recipes", "recipients", "recommendations", "recommends", "recorders",
    "recordings", "records", "reduces", "reductions", "references",
    "referrals", "refers", "reflections", "reflects", "reforms", "regards",
    "regions", "regulations", "relates", "relations", "relationships",
    "relatives", "releases", "religions", "remains", "remarks", "rentals",
    "repairs", "reporters", "reports", "representations", "representatives",
    "represents", "reprints", "republicans", "requests", "requirements",
    "requires", "res", "researchers", "reservations", "reserves", "residents",
    "resolutions", "resorts", "resources", "respondents", "responses",
    "restaurants", "restrictions", "results", "resumes", "retailers",
    "returns", "reveals", "revenues", "reviews", "revisions", "rewards",
    "richards", "riders", "rides", "rights", "rings", "ringtones", "risks",
    "rivers", "roads", "roberts", "robots", "rocks", "rogers", "roles",
    "rolls", "roommates", "rooms", "roots", "roses", "rounds", "routers",
    "routes", "routines", "rows", "rss", "rugs", "rules", "runs", "saints",
    "sales", "samples", "sans", "sas", "saves", "savings", "says", "scales",
    "scanners", "scenarios", "scenes", "schedules", "schemes", "scholars",
    "scholarships", "schools", "sciences", "scientists", "scores", "screens",
    "screensavers", "screenshots", "scripts", "seas", "seasons", "seats",
    "seconds", "secrets", "sections", "sectors", "seeds", "seekers", "seeks",
    "seems", "sees", "segments", "selections", "sellers", "sells", "seminars",
    "senators", "sends", "seniors", "sensors", "sentences", "sequences",
    "servers", "serves", "services", "sessions", "sets", "settings", "shades",
    "shadows", "shapes", "shares", "sheets", "shemales", "shipments", "ships",
    "shirts", "shoes", "shoppers", "shops", "shorts", "shots", "showers",
    "shows", "sides", "signals", "signatures", "signs", "simpsons", "sims",
    "simulations", "singles", "sisters", "sites", "situations", "sizes",
    "skills", "skins", "skirts", "sleeps", "slides", "slots", "sluts", "sms",
    "soldiers", "solutions", "songs", "sons", "sorts", "souls", "sounds",
    "sources", "spaces", "spas", "speakers", "speaks", "specialists",
    "specials", "specifications", "specifics", "specs", "speeds", "spirits",
    "sponsors", "sports", "spots", "springs", "stages", "stamps", "standards",
    "standings", "stands", "stars", "starts", "statements", "states",
    "stations", "stats", "statutes", "stays", "steps", "stevens", "stickers",
    "sticks", "stocks", "stones", "stops", "stores", "streams", "streets",
    "strengths", "strikes", "strings", "strips", "structures", "students",
    "studios", "styles", "subjects", "submissions", "subscribers",
    "subscriptions", "substances", "sucks", "suggestions", "suggests",
    "suites", "suits", "supervisors", "supplements", "suppliers", "supports",
    "surfaces", "surgeons", "surveys", "survivors", "symbols", "systems",
    "tables", "tablets", "tabs", "tags", "takes", "tales", "talks", "tanks",
    "tapes", "targets", "tasks", "teachers", "teams", "tears", "techniques",
    "teens", "televisions", "tells", "temperatures", "templates", "terminals",
    "terms", "terrorists", "tests", "textbooks", "textiles", "texts",
    "thanks", "thats", "theaters", "themes", "things", "thinks", "thongs",
    "thoughts", "thousands", "threads", "threats", "throws", "thumbnails",
    "thumbs", "thus", "tickets", "ties", "tigers", "tiles", "times", "tions",
    "tips", "tires", "titles", "tits", "tones", "tons", "tools", "topics",
    "tops", "totals", "tournaments", "tours", "towards", "towers", "towns",
    "toys", "trackbacks", "tracks", "trademarks", "trades", "traditions",
    "trailers", "trails", "trainers", "trains", "transactions", "transcripts",
    "transfers", "translations", "travelers", "travels", "treasures",
    "treatments", "trees", "trends", "trials", "tribes", "tricks", "trips",
    "trucks", "trustees", "trusts", "tubes", "tunes", "turns", "tutorials",
    "tvs", "twins", "types", "unions", "units", "updates", "upgrades", "ups",
    "upskirts", "urls", "users", "uses", "vacations", "values", "valves",
    "variables", "variations", "vegetables", "vehicles", "vendors",
    "ventures", "venues", "versions", "vessels", "veterans", "vibrators",
    "victims", "videos", "vids", "viewers", "views", "villages", "villas",
    "violations", "visitors", "visits", "vitamins", "vocals", "voices",
    "volumes", "volunteers", "votes", "wages", "walks", "wallpapers", "walls",
    "wants", "warnings", "warriors", "wars", "waters", "watts",
    "waves", "ways", "weapons", "webcams", "weblogs", "webmasters",
    "websites", "weddings", "weekends", "weeks", "weights", "wells", "whats",
    "wheels", "williams", "windows", "winds", "wines", "wings", "winners",
    "wins", "wires", "womens", "woods", "words", "workers", "works",
    "workshops", "worlds", "writers", "writes", "writings", "yards", "years",
    "yes", "yields", "yours", "yrs", "zones"
]);


const pluralES = new Set([
    "addresses", "ages", "approaches", "beaches", "bones", "boxes",
    "branches", "buses", "businesses", "cases", "churches", "classes",
    "clothes", "coaches", "codes", "comes", "dates", "discusses", "dishes",
    "dresses", "fares", "fees", "fixes", "focuses", "genes", "glasses",
    "goes", "grades", "hayes", "heroes", "hopes", "hughes", "inches",
    "indexes", "james", "jones", "lanes", "launches", "lenses",
    "losses", "matches", "names", "notes", "passes", "patches",
    "potatoes", "processes", "reaches", "rides", "searches", "sees", "sites",
    "speeches", "switches", "tapes", "taxes", "teaches", "themes", "ties",
    "tiles", "times", "tomatoes", "tubes", "uses",
    "viruses", "wales", "watches", "waves", "wishes", "witnesses",
]);

// Arrays above based in part on https://www.mit.edu/~ecprice/wordlist.10000
// Lots of weird/mildly offensive terms in there; we can remove as needed.

const deplural = (input)=>{
    if (pluralS.has(input)) {
        return 1;
    } else if (pluralES.has(input)) {
        return 2;
    }
    return 0;
}


export const depluralize =(words)=>{
    for (let i = 0; i < words.length; i++) {
        let count = deplural(words[i]);
        if (count) {
            words[i] = words[i].substring(0, words[i].length - count);
        }
    }
}


// https://gist.github.com/sebleier/554280
const STOP_WORDS = new Set([
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your",
    "yours", "yourself", "yourselves", "he", "him", "his", "himself", "she",
    "her", "hers", "herself", "it", "its", "itself", "they", "them", "their",
    "theirs", "themselves", "what", "which", "who", "whom", "this", "that",
    "these", "those", "am", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an",
    "the", "and", "but", "if", "or", "because", "as", "until", "while", "of",
    "at", "by", "for", "with", "about", "against", "between", "into",
    "through", "during", "before", "after", "above", "below", "to", "from",
    "up", "down", "in", "out", "on", "off", "over", "under", "again",
    "further", "then", "once", "here", "there", "when", "where", "why", "how",
    "all", "any", "both", "each", "few", "more", "most", "other", "some",
    "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too",
    "very", "s", "t", "can", "will", "just", "don", "should", "now"
]);

export const legitWord = (word)=>{
    // not a stop word, and not a number
    return word.length != 0 && !STOP_WORDS.has(word) && word.match(/^[\d]+$/) == null;
}

