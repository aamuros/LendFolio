export type PhilippineAddressSelection = {
  regionCode: string;
  regionName: string;
  cityOrMunicipality: string;
  barangay: string;
  zipCode: string;
};

type CityData = {
  zipCode: string;
  barangays: string[];
};

type RegionData = {
  name: string;
  cities: Record<string, CityData>;
};

const PHILIPPINE_ZIP_CODE_PATTERN = /^\d{4}$/;

const ADDRESS_DATA: Record<string, RegionData> = {
  NCR: {
    name: "NCR - National Capital Region",
    cities: {
      "Quezon City": {
        zipCode: "1100",
        barangays: [
          "Bagong Pag-asa",
          "Batasan Hills",
          "Commonwealth",
          "Holy Spirit",
          "Payatas",
          "Project 6",
          "U.P. Campus",
          "Tandang Sora",
        ],
      },
      Manila: {
        zipCode: "1000",
        barangays: [
          "Barangay 1",
          "Barangay 76",
          "Barangay 435",
          "Barangay 587",
          "Barangay 818-A",
          "Barangay 866",
          "Barangay 905",
        ],
      },
      Makati: {
        zipCode: "1200",
        barangays: [
          "Bangkal",
          "Bel-Air",
          "Guadalupe Nuevo",
          "Poblacion",
          "San Antonio",
          "San Lorenzo",
          "Urdaneta",
        ],
      },
      Pasig: {
        zipCode: "1600",
        barangays: [
          "Bagong Ilog",
          "Caniogan",
          "Kapitolyo",
          "Manggahan",
          "Oranbo",
          "Rosario",
          "San Joaquin",
          "Ugong",
        ],
      },
      Taguig: {
        zipCode: "1630",
        barangays: [
          "Bagumbayan",
          "Bambang",
          "Fort Bonifacio",
          "Lower Bicutan",
          "Tuktukan",
          "Upper Bicutan",
          "Western Bicutan",
        ],
      },
      Mandaluyong: {
        zipCode: "1550",
        barangays: [
          "Addition Hills",
          "Barangka Drive",
          "Hulo",
          "Malamig",
          "Plainview",
          "Poblacion",
          "Vergara",
        ],
      },
      Pasay: {
        zipCode: "1300",
        barangays: [
          "Barangay 1",
          "Barangay 10",
          "Barangay 76",
          "Barangay 100",
          "Barangay 150",
          "Barangay 201",
        ],
      },
      Caloocan: {
        zipCode: "1400",
        barangays: [
          "Barangay 1",
          "Barangay 12",
          "Barangay 50",
          "Barangay 86",
          "Barangay 120",
          "Barangay 160",
          "Barangay 188",
        ],
      },
      "Las Piñas": {
        zipCode: "1740",
        barangays: [
          "Almanza Uno",
          "B. F. International Village",
          "Daniel Fajardo",
          "Ilaya",
          "Manuyo Uno",
          "Pamplona Uno",
          "Pilar",
          "Talon Uno",
        ],
      },
      Muntinlupa: {
        zipCode: "1770",
        barangays: [
          "Alabang",
          "Bayanan",
          "Buli",
          "Cupang",
          "Poblacion",
          "Putatan",
          "Sucat",
          "Tunasan",
        ],
      },
    },
  },
  CAR: {
    name: "CAR - Cordillera Administrative Region",
    cities: {
      Baguio: {
        zipCode: "2600",
        barangays: [
          "Aurora Hill Proper",
          "Camp 7",
          "Irisan",
          "Loakan Proper",
          "Lourdes Subdivision Extension",
          "Quezon Hill Proper",
          "San Luis Village",
          "Session Road Area",
        ],
      },
      "La Trinidad": {
        zipCode: "2601",
        barangays: [
          "Alapang",
          "Balili",
          "Betag",
          "Cruz",
          "Lubas",
          "Pico",
          "Poblacion",
          "Shilan",
        ],
      },
      Tabuk: {
        zipCode: "3800",
        barangays: [
          "Agbannawag",
          "Bado Dangwa",
          "Bulanao",
          "Calaccad",
          "Dagupan Centro",
          "Laya East",
          "Nambaran",
          "Tuga",
        ],
      },
      "Bangued": {
        zipCode: "2800",
        barangays: [
          "Agtangao",
          "Angad",
          "Bañacao",
          "Calaba",
          "Cosili West",
          "Lingtan",
          "Lipcan",
          "Poblacion",
        ],
      },
    },
  },
  "Region I": {
    name: "Region I - Ilocos Region",
    cities: {
      "San Fernando": {
        zipCode: "2000",
        barangays: [
          "Bangcusay",
          "Biday",
          "Canaoay",
          "Carlatan",
          "Catbangen",
          "Dalumpinas",
          "Lingsat",
          "Poro",
        ],
      },
      Dagupan: {
        zipCode: "2400",
        barangays: [
          "Bonuan Binloc",
          "Bonuan Gueset",
          "Calmay",
          "Carael",
          "Herrero",
          "Lasip Chico",
          "Pantal",
          "Poblacion Oeste",
        ],
      },
      Laoag: {
        zipCode: "2900",
        barangays: [
          "Barit",
          "Buttong",
          "Gabu Norte",
          "Lagui-Sail",
          "Poblacion",
          "San Guillermo",
          "San Nicolas",
          "Vira",
        ],
      },
      Vigan: {
        zipCode: "2700",
        barangays: [
          "Ayusan Norte",
          "Burgos",
          "Flores",
          "Poblacion",
          "San Julian Norte",
          "San Pedro",
          "Tamag",
          "Villa Quirino",
        ],
      },
      "San Carlos": {
        zipCode: "2420",
        barangays: [
          "Bacnar",
          "Binalonan",
          "Calobaoan",
          "Mestizo Norte",
          "Poblacion",
          "San Juan",
          "Tandoc",
          "Turac",
        ],
      },
    },
  },
  "Region II": {
    name: "Region II - Cagayan Valley",
    cities: {
      Tuguegarao: {
        zipCode: "3500",
        barangays: [
          "Annafunan East",
          "Atulayan Norte",
          "Bagay",
          "Buntun",
          "Carig",
          "Centro",
          "Larion Alto",
          "Pengue-Ruyu",
        ],
      },
      "Santiago": {
        zipCode: "3311",
        barangays: [
          "Balintocatoc",
          "Batal",
          "Buenavista",
          "Cabulay",
          "Centro East",
          "Divisoria",
          "Dubinan East",
          "Rizal",
        ],
      },
      "Ilagan": {
        zipCode: "3300",
        barangays: [
          "Alibagu",
          "Bagong Silang",
          "Centro",
          "Fugu",
          "Lullutan",
          "Marana",
          "San Felipe",
          "Sinippil",
        ],
      },
      "Cauayan": {
        zipCode: "3305",
        barangays: [
          "District I",
          "District II",
          "District III",
          "District IV",
          "Domigan",
          "Gammad",
          "La Union",
          "Turu",
        ],
      },
    },
  },
  "Region III": {
    name: "Region III - Central Luzon",
    cities: {
      "San Fernando": {
        zipCode: "2000",
        barangays: [
          "Alasas",
          "Baliti",
          "Calulut",
          "Dela Paz Norte",
          "Dolores",
          "Juliana",
          "Lara",
          "Sindalan",
        ],
      },
      Angeles: {
        zipCode: "2009",
        barangays: [
          "Agapito del Rosario",
          "Balibago",
          "Cutcut",
          "Lourdes Northwest",
          "Malabanias",
          "Pulung Maragul",
          "Salapungan",
          "Sto. Rosario",
        ],
      },
      Olongapo: {
        zipCode: "2200",
        barangays: [
          "Asinan",
          "Barretto",
          "Gordon Heights",
          "Kalaklan",
          "Mabayuan",
          "New Cabalan",
          "Old Cabalan",
          "Sta. Rita",
        ],
      },
      Cabanatuan: {
        zipCode: "3100",
        barangays: [
          "Aduas Centro",
          "Bagong Sikat",
          "Bernardo District",
          "Camp Tinio",
          "Kapitan Pepe",
          "Magsaysay Norte",
          "Padre Crisostomo",
          "Sumacab Este",
        ],
      },
      Malolos: {
        zipCode: "3000",
        barangays: [
          "Anilao",
          "Atlag",
          "Bagna",
          "Balayong",
          "Canalate",
          "Ligas",
          "Panasahan",
          "Sto. Rosario",
        ],
      },
      Meycauayan: {
        zipCode: "3020",
        barangays: [
          "Bagbaguin",
          "Bahay Pare",
          "Bancal",
          "Camalig",
          "Gasak",
          "Langka",
          "Pajo",
          "Pandayan",
        ],
      },
    },
  },
  "Region IV-A": {
    name: "Region IV-A - CALABARZON",
    cities: {
      Calamba: {
        zipCode: "4027",
        barangays: [
          "Bagong Kalsada",
          "Banadero",
          "Banlic",
          "Barandal",
          "Bucal",
          "Canlubang",
          "Halang",
          "Paciano Rizal",
        ],
      },
      Antipolo: {
        zipCode: "1870",
        barangays: [
          "Bagong Nayon",
          "Beverly Hills",
          "Dela Paz",
          "Inarawan",
          "Mayamot",
          "Muntingdilaw",
          "San Isidro",
          "Sta. Cruz",
        ],
      },
      Batangas: {
        zipCode: "4200",
        barangays: [
          "Alangilan",
          "Balagtas",
          "Bilogo",
          "Calicanto",
          "Cuta",
          "Gov. Pablo Borbon",
          "Kumintang Ibaba",
          "Poblacion",
        ],
      },
      "Lucena": {
        zipCode: "4301",
        barangays: [
          "Barangay 1",
          "Barra",
          "Cotta",
          "Gulang-Gulang",
          "Ibabang Dupay",
          "Ilayang Dupay",
          "Isabang",
          "Market View",
        ],
      },
      Cavite: {
        zipCode: "4100",
        barangays: [
          "Barangay 1",
          "Caridad",
          "San Antonio",
          "San Jose",
          "San Juan",
          "San Rafael",
          "Sta. Cruz",
          "Tabing Dagat",
        ],
      },
      Imus: {
        zipCode: "4103",
        barangays: [
          "Alapan I",
          "Bayan Luma",
          "Bucandala",
          "Malagasang",
          "Medicion",
          "Pag-asa",
          "Poblacion",
          "Toclong",
        ],
      },
    },
  },
  "Region IV-B": {
    name: "Region IV-B - MIMAROPA",
    cities: {
      Calapan: {
        zipCode: "5200",
        barangays: [
          "Bucayao",
          "Bulusan",
          "Guinobatan",
          "Gutad",
          "Ibaba East",
          "Mahal na Pangalan",
          "Nag-iba I",
          "San Vicente Central",
        ],
      },
      "Puerto Princesa": {
        zipCode: "5300",
        barangays: [
          "Bagong Pag-asa",
          "Bancao-Bancao",
          "Concepcion",
          "Irawan",
          "Mandaragat",
          "San Jose",
          "San Manuel",
          "Sta. Monica",
        ],
      },
      Romblon: {
        zipCode: "5500",
        barangays: [
          "Agbaluto",
          "Agbudia",
          "Agnaga",
          "Cajimos",
          "Capaclan",
          "Lumangbayan",
          "Poblacion",
          "Tiamban",
        ],
      },
      Boac: {
        zipCode: "4900",
        barangays: [
          "Balingbing",
          "Bamban",
          "Boton",
          "Cawit",
          "Ipil",
          "Maligaya",
          "Murallon",
          "Poblacion",
        ],
      },
    },
  },
  "Region V": {
    name: "Region V - Bicol Region",
    cities: {
      Legazpi: {
        zipCode: "4500",
        barangays: [
          "Bagong Abre",
          "Bgy. 1",
          "Bgy. 37",
          "Bgy. 47",
          "Dita",
          "Gogon",
          "Pawa",
          "Rawis",
        ],
      },
      Naga: {
        zipCode: "4400",
        barangays: [
          "Abella",
          "Bagumbayan Norte",
          "Calauag",
          "Cararayan",
          "Concepcion Grande",
          "Dayangdang",
          "Dinaga",
          "Mabolo",
        ],
      },
      Sorsogon: {
        zipCode: "4700",
        barangays: [
          "Abuyog",
          "Balogo",
          "Bibincahan",
          "Bitan-o",
          "Bucalbucalan",
          "Gimaloto",
          "Pangpang",
          "Sirangan",
        ],
      },
      Iriga: {
        zipCode: "4431",
        barangays: [
          "Antipolo",
          "Batang",
          "Cristo Rey",
          "La Purisima",
          "La Trinidad",
          "Perpetual Help",
          "San Agustin",
          "San Nicolas",
        ],
      },
    },
  },
  "Region VI": {
    name: "Region VI - Western Visayas",
    cities: {
      "Iloilo City": {
        zipCode: "5000",
        barangays: [
          "City Proper",
          "Jaro",
          "La Paz",
          "Lapuz",
          "Mandurriao",
          "Molo",
          "Arevalo",
          "Villa",
        ],
      },
      Bacolod: {
        zipCode: "6100",
        barangays: [
          "Barangay 1",
          "Bata",
          "Estefania",
          "Granada",
          "Handumanan",
          "Mandalagan",
          "Mansilingan",
          "Singcang-Airport",
        ],
      },
      Roxas: {
        zipCode: "5800",
        barangays: [
          "Bago",
          "Banica",
          "Bolo",
          "Dayao",
          "Dinginan",
          "Gabu-an",
          "Inzo Arnaldo",
          "Poblacion",
        ],
      },
      Kalibo: {
        zipCode: "5600",
        barangays: [
          "Andagao",
          "Bakhaw",
          "Buswang New",
          "Estancia",
          "Mobo",
          "Nalook",
          "Poblacion",
          "Tigayon",
        ],
      },
      "San Jose de Buenavista": {
        zipCode: "5700",
        barangays: [
          "Atabay",
          "Badiang",
          "Igbongloto",
          "Inabasan",
          "Madrangca",
          "Maybato Norte",
          "Poblacion",
          "San Pedro",
        ],
      },
    },
  },
  "Region VII": {
    name: "Region VII - Central Visayas",
    cities: {
      "Cebu City": {
        zipCode: "6000",
        barangays: [
          "Apas",
          "Banilad",
          "Capitol Site",
          "Guadalupe",
          "Lahug",
          "Mabolo",
          "Pardo",
          "T. Padilla",
        ],
      },
      LapuLapu: {
        zipCode: "6015",
        barangays: [
          "Agus",
          "Babag",
          "Bankal",
          "Basak",
          "Bua",
          "Gun-ob",
          "Ibo",
          "Pajo",
        ],
      },
      Mandaue: {
        zipCode: "6014",
        barangays: [
          "Alang-alang",
          "Banilad",
          "Basak",
          "Centro",
          "Guizo",
          "Ibabao-Estancia",
          "Mantuyong",
          "Opao",
        ],
      },
      Tagbilaran: {
        zipCode: "6300",
        barangays: [
          "Bool",
          "Cogon",
          "Dao",
          "Dampas",
          "Manga",
          "Poblacion II",
          "San Isidro",
          "Taloto",
        ],
      },
      Dumaguete: {
        zipCode: "6200",
        barangays: [
          "Bagacay",
          "Bantayan",
          "Batinguel",
          "Cadawinonan",
          "Camanjac",
          "Candau-ay",
          "Daro",
          "Piapi",
        ],
      },
    },
  },
  "Region VIII": {
    name: "Region VIII - Eastern Visayas",
    cities: {
      Tacloban: {
        zipCode: "6500",
        barangays: [
          "Barangay 2",
          "Diit",
          "Kawayan",
          "Magallanes",
          "San Jose",
          "San Paglaum",
          "Suhi",
          "V&G Subdivision",
        ],
      },
      Ormoc: {
        zipCode: "6541",
        barangays: [
          "Airport",
          "Alegria",
          "Bantigue",
          "Batuan",
          "Carmen",
          "Cogon Combado",
          "Dolores",
          "San Jose",
        ],
      },
      Catbalogan: {
        zipCode: "6700",
        barangays: [
          "Barangay 1",
          "Barangay 10",
          "Barangay 7",
          "Cabugawan",
          "Guinsorongan",
          "Ilag",
          "Maulong",
          "San Andres",
        ],
      },
      Maasin: {
        zipCode: "6600",
        barangays: [
          "Abgao",
          "Asuncion",
          "Bactul Dos",
          "Bagong Lipunan",
          "Bilibol",
          "Hantag",
          "Isagani",
          "Poblacion",
        ],
      },
    },
  },
  "Region IX": {
    name: "Region IX - Zamboanga Peninsula",
    cities: {
      "Zamboanga City": {
        zipCode: "7000",
        barangays: [
          "Arena Blanco",
          "Ayala",
          "Baliwasan",
          "Boalan",
          "Calarian",
          "Divisoria",
          "Guiwan",
          "Tetuan",
        ],
      },
      Pagadian: {
        zipCode: "7016",
        barangays: [
          "Balangasan",
          "Baloyboan",
          "Banale",
          "Bogo",
          "Buenavista",
          "Gatas",
          "Kagawasan",
          "San Jose",
        ],
      },
      Dipolog: {
        zipCode: "7100",
        barangays: [
          "Barra",
          "Biasong",
          "Central",
          "Cogon",
          "Dicayas",
          "Diwan",
          "Galas",
          "Sicayab",
        ],
      },
      Isabela: {
        zipCode: "7300",
        barangays: [
          "Aguada",
          "Balatanay",
          "Binuangan",
          "Busay",
          "Cabcaban",
          "Calvario",
          "Caridad",
          "Sumagdang",
        ],
      },
    },
  },
  "Region X": {
    name: "Region X - Northern Mindanao",
    cities: {
      "Cagayan de Oro": {
        zipCode: "9000",
        barangays: [
          "Balulang",
          "Bugo",
          "Carmen",
          "Consolacion",
          "Gusa",
          "Lapasan",
          "Macasandig",
          "Patag",
        ],
      },
      Iligan: {
        zipCode: "9200",
        barangays: [
          "Buru-un",
          "Dalipuga",
          "Ditucalan",
          "Hinaplanon",
          "Kabacsanan",
          "Pala-o",
          "Poblacion",
          "Tibanga",
        ],
      },
      "Valencia": {
        zipCode: "8709",
        barangays: [
          "Bagontaas",
          "Batangan",
          "Colonia",
          "Lilingayon",
          "Lumbayao",
          "Lurugan",
          "Poblacion",
          "Sugod",
        ],
      },
      Malaybalay: {
        zipCode: "8700",
        barangays: [
          "Aglayan",
          "Bangcud",
          "Barangay 1",
          "Casisang",
          "Dalwangan",
          "Laguitas",
          "San Jose",
          "Sumpong",
        ],
      },
      "Ozamiz City": {
        zipCode: "7200",
        barangays: [
          "Banga",
          "Baybay San Roque",
          "Catadman",
          "Cogon",
          "Dicayas",
          "Mabini",
          "Sta. Cruz",
          "Triumph",
        ],
      },
    },
  },
  "Region XI": {
    name: "Region XI - Davao Region",
    cities: {
      "Davao City": {
        zipCode: "8000",
        barangays: [
          "Agdao",
          "Bago Aplaya",
          "Buhangin",
          "Catalunan Grande",
          "Matina",
          "Poblacion",
          "Talomo",
          "Toril",
        ],
      },
      Tagum: {
        zipCode: "8100",
        barangays: [
          "Apokon",
          "Bincungan",
          "Busaon",
          "Canocotan",
          "Cuambogan",
          "La Filipina",
          "Liboganon",
          "Poblacion",
        ],
      },
      Panabo: {
        zipCode: "8105",
        barangays: [
          "A.O. Floirendo",
          "Cagangohan",
"Gredu",
          "Kasilak",
          "Mabunao",
          "New Malitbog",
          "Poblacion",
          "San Pedro",
        ],
      },
      "Digos": {
        zipCode: "8002",
        barangays: [
          "Aplaya",
          "Binaton",
          "Cogon",
          "Dawan",
          "Dulangan",
          "Goma",
          "Igpit",
          "Poblacion",
        ],
      },
      Mati: {
        zipCode: "8200",
        barangays: [
          "Badas",
          "Central",
          "Dahican",
          "Lupon",
          "Matiao",
          "Mayo",
          "Sainz",
          "Taguak",
        ],
      },
    },
  },
  "Region XII": {
    name: "Region XII - SOCCSKSARGEN",
    cities: {
      "General Santos": {
        zipCode: "9500",
        barangays: [
          "Apopong",
          "Baluan",
          "Batomelong",
          "Buayan",
          "Calumpang",
          "City Heights",
          "Dadiangas East",
          "Lagao",
        ],
      },
      Koronadal: {
        zipCode: "9506",
        barangays: [
          "Assumption",
          "Avanceña",
          "Carpenter Hill",
          "General Paulino Santos",
          "Magsaysay",
          "Morales",
          "Paraiso",
          "Zone I",
        ],
      },
      Kidapawan: {
        zipCode: "9400",
        barangays: [
          "Amas",
          "Balindog",
          "Binoligan",
          "California",
          "Juliana",
          "Macebolig",
          "Poblacion",
          "Sudapin",
        ],
      },
      Tacurong: {
        zipCode: "9800",
        barangays: [
          "Baras",
          "Bato Esperanza",
          "Calean",
          "Carmen",
          "D'Ledesma",
          "Griño",
          "Kalandagan",
          "Poblacion",
        ],
      },
    },
  },
  "Region XIII": {
    name: "Region XIII - Caraga",
    cities: {
      Butuan: {
        zipCode: "8600",
        barangays: [
          "Agusan Pequeño",
          "Ambago",
          "Baobaoan",
          "Banza",
          "Bayanihan",
          "Buhangin",
          "Dagohoy",
          "Mahogany",
        ],
      },
      Surigao: {
        zipCode: "8400",
        barangays: [
          "Alang-alang",
          "Bilabid",
          "Canlanipa",
          "Cagutsan",
          "Lipata",
          "Nabago",
          "Rizal",
          "San Juan",
        ],
      },
      Bislig: {
        zipCode: "8311",
        barangays: [
          "Bgy. 1",
          "Bgy. 12",
          "Bucatan",
          "Cumawas",
          "Lawigan",
          "Mangagoy",
          "Pamanlinan",
          "San Jose",
        ],
      },
      Tandag: {
        zipCode: "8300",
        barangays: [
          "Awasian",
          "Bagong Lungsod",
          "Bioto",
          "Bongtud",
"Consuelo",
          "Dadayan",
          "Dawan",
          "Poblacion",
        ],
      },
    },
  },
  BARMM: {
    name: "BARMM - Bangsamoro Autonomous Region in Muslim Mindanao",
    cities: {
      Cotabato: {
        zipCode: "9600",
        barangays: [
          "Bagua",
          "Kalanganan",
          "Poblacion",
          "Rosary Heights",
          "Tamontaka",
          "Mother Kabuntalan",
          "Bagua II",
          "Poblacion II",
        ],
      },
      Marawi: {
        zipCode: "9700",
        barangays: [
          "Ambolong",
          "Bangon",
          "Bubong",
          "Daguduban",
          "Fort",
          "Kapantaran",
          "Marinaut",
          "Poblacion",
        ],
      },
      Jolo: {
        zipCode: "7400",
        barangays: [
          "Alat",
          "Asturias",
          "Bus-bus",
          "Chinese Pier",
          "San Raymundo",
          "Takut-Takut",
          "Tulay",
          "Walled City",
        ],
      },
      Bongao: {
        zipCode: "7500",
        barangays: [
          "Bongao Proper",
          "Ipil",
          "Kamagong",
          "Lagasan",
          "Lagao",
          "Nalil",
          "Pababag",
          "Sanga-Sanga",
        ],
      },
    },
  },
};

export const REGION_CODES = Object.keys(ADDRESS_DATA) as string[];

export function getRegions(): Array<{ code: string; name: string }> {
  return REGION_CODES.map((code) => ({
    code,
    name: ADDRESS_DATA[code].name,
  }));
}

export function getCitiesByRegion(regionCode: string): string[] {
  const region = ADDRESS_DATA[regionCode];
  if (!region) return [];
  return Object.keys(region.cities);
}

export function getBarangaysByCity(
  regionCode: string,
  cityOrMunicipality: string,
): string[] {
  const region = ADDRESS_DATA[regionCode];
  if (!region) return [];
  const city = region.cities[cityOrMunicipality];
  if (!city) return [];
  return city.barangays;
}

export function getZipCodeByCity(
  regionCode: string,
  cityOrMunicipality: string,
): string | null {
  const region = ADDRESS_DATA[regionCode];
  if (!region) return null;
  const city = region.cities[cityOrMunicipality];
  if (!city) return null;
  return city.zipCode;
}

export function getZipCodesByCity(
  regionCode: string,
  cityOrMunicipality: string,
): string[] {
  const zipCode = getZipCodeByCity(regionCode, cityOrMunicipality);
  return zipCode ? [zipCode] : [];
}

export function isValidPhilippineAddressSelection(
  selection: Partial<PhilippineAddressSelection>,
): selection is PhilippineAddressSelection {
  if (
    !selection.regionCode ||
    !selection.cityOrMunicipality ||
    !selection.barangay ||
    !selection.zipCode
  ) {
    return false;
  }

  const region = ADDRESS_DATA[selection.regionCode];
  if (!region) return false;

  const city = region.cities[selection.cityOrMunicipality];
  if (!city) return false;

  if (!city.barangays.includes(selection.barangay)) return false;
  if (!PHILIPPINE_ZIP_CODE_PATTERN.test(selection.zipCode)) return false;

  return true;
}

export function formatPhilippineAddress(
  selection: Pick<
    PhilippineAddressSelection,
    "barangay" | "cityOrMunicipality" | "regionName" | "zipCode"
  >,
  streetAddress?: string,
): string {
  const parts: string[] = [];

  if (streetAddress?.trim()) {
    parts.push(streetAddress.trim());
  }
  parts.push(selection.barangay);
  parts.push(selection.cityOrMunicipality);
  parts.push(selection.regionName);
  parts.push(selection.zipCode);

  return parts.join(", ");
}

export function getRegionNameByCode(regionCode: string): string {
  return ADDRESS_DATA[regionCode]?.name ?? regionCode;
}

export function getRegionCodeByName(regionName: string): string | null {
  for (const [code, region] of Object.entries(ADDRESS_DATA)) {
    if (region.name === regionName) return code;
  }
  return null;
}

export function parseLegacyAddress(legacyAddress: string): Partial<PhilippineAddressSelection> | null {
  if (!legacyAddress?.trim()) return null;

  for (const [code, region] of Object.entries(ADDRESS_DATA)) {
    if (legacyAddress.includes(region.name)) {
      for (const [cityName, cityData] of Object.entries(region.cities)) {
        if (legacyAddress.includes(cityName)) {
          const matchedBarangay = cityData.barangays.find((b) =>
            legacyAddress.includes(b),
          );
          if (matchedBarangay) {
            return {
              regionCode: code,
              regionName: region.name,
              cityOrMunicipality: cityName,
              barangay: matchedBarangay,
              zipCode: cityData.zipCode,
            };
          }
        }
      }
    }
  }

  return null;
}
