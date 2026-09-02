"""Lightweight India state/district coordinate lookup for map rendering.

Coordinates are approximate centroids. Used to render heatmap points when
geospatial data is not available from the survey provider.
"""

# State-level centroids (lat, lng) for India's major states/UTs.
STATE_COORDS: dict[str, tuple[float, float]] = {
    "Andhra Pradesh": (15.9129, 79.7400),
    "Arunachal Pradesh": (28.2180, 94.7278),
    "Assam": (26.2006, 92.9376),
    "Bihar": (25.0961, 85.3131),
    "Chhattisgarh": (21.2787, 81.8661),
    "Goa": (15.2993, 74.1240),
    "Gujarat": (22.2587, 71.1924),
    "Haryana": (29.0588, 76.0856),
    "Himachal Pradesh": (31.1048, 77.1734),
    "Jharkhand": (23.6102, 85.2799),
    "Karnataka": (15.3173, 75.7139),
    "Kerala": (10.8505, 76.2711),
    "Madhya Pradesh": (22.9734, 78.6569),
    "Maharashtra": (19.7515, 75.7139),
    "Manipur": (24.6637, 93.9063),
    "Meghalaya": (25.4670, 91.3662),
    "Mizoram": (23.1645, 92.9376),
    "Nagaland": (26.1584, 94.5624),
    "Odisha": (20.9517, 85.0985),
    "Punjab": (31.1471, 75.3412),
    "Rajasthan": (27.0238, 74.2179),
    "Sikkim": (27.5330, 88.5122),
    "Tamil Nadu": (11.1271, 78.6569),
    "Telangana": (18.1124, 79.0193),
    "Tripura": (23.9408, 91.9882),
    "Uttar Pradesh": (26.8467, 80.9462),
    "Uttarakhand": (30.0668, 79.0193),
    "West Bengal": (22.9868, 87.8550),
    "Delhi": (28.7041, 77.1025),
    "Jammu and Kashmir": (33.7782, 76.5762),
    "Ladakh": (34.2268, 77.5619),
    "Puducherry": (11.9416, 79.8083),
    "Chandigarh": (30.7333, 76.7794),
}

# Notable district centroids for the metropolitan/industrial districts users
# most often filter by. Falls back to the state centroid when absent.
DISTRICT_COORDS: dict[str, tuple[float, float]] = {
    "bengaluru": (12.9716, 77.5946),
    "bangalore": (12.9716, 77.5946),
    "bengaluru urban": (12.9716, 77.5946),
    "mumbai": (19.0760, 72.8777),
    "mumbai suburban": (19.0760, 72.8777),
    "pune": (18.5204, 73.8567),
    "thane": (19.2183, 72.9781),
    "nagpur": (21.1458, 79.0882),
    "hyderabad": (17.3850, 78.4867),
    "chennai": (13.0827, 80.2707),
    "kolkata": (22.5726, 88.3639),
    "delhi": (28.7041, 77.1025),
    "new delhi": (28.6139, 77.2090),
    "gurugram": (28.4595, 77.0266),
    "gurgaon": (28.4595, 77.0266),
    "noida": (28.5355, 77.3910),
    "greater noida": (28.4744, 77.5040),
    "jaipur": (26.9124, 75.7873),
    "lucknow": (26.8467, 80.9462),
    "ahmedabad": (23.0225, 72.5714),
    "surat": (21.1702, 72.8311),
    "indore": (22.7196, 75.8577),
    "bhopal": (23.2599, 77.4126),
    "kochi": (9.9312, 76.2673),
    "kozhikode": (11.2588, 75.7804),
    "patna": (25.5941, 85.1376),
    "ranchi": (23.3441, 85.3096),
    "bhubaneswar": (20.2961, 85.8245),
    "guwahati": (26.1445, 91.7362),
    "coimbatore": (11.0168, 76.9558),
    "madurai": (9.9252, 78.1198),
    "vijayawada": (16.5062, 80.6480),
    "visakhapatnam": (17.6868, 83.2185),
}


def normalize(value: str | None) -> str:
    if not value:
        return ""
    return " ".join(value.strip().lower().split())


def resolve_coordinates(state: str | None, district: str | None) -> tuple[float | None, float | None]:
    """Return (lat, lng) for a state/district, or (None, None) when unknown."""
    if district:
        coords = DISTRICT_COORDS.get(normalize(district))
        if coords:
            return coords
    if state:
        coords = STATE_COORDS.get(normalize(state)) or STATE_COORDS.get(state)
        if coords:
            return coords
    return (None, None)
