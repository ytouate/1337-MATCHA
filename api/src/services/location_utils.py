import hashlib
import math

MAP_FUZZ_MIN_METERS = 300
MAP_FUZZ_MAX_METERS = 800
METERS_PER_DEGREE_LAT = 111_320


def fuzz_map_coordinates(
    user_id: int, latitude: float, longitude: float
) -> tuple[float, float]:
    digest = hashlib.sha256(str(user_id).encode()).digest()
    angle = (digest[0] / 255.0) * 2 * math.pi
    distance_m = MAP_FUZZ_MIN_METERS + (digest[1] / 255.0) * (
        MAP_FUZZ_MAX_METERS - MAP_FUZZ_MIN_METERS
    )

    lat_offset = (distance_m * math.cos(angle)) / METERS_PER_DEGREE_LAT
    lng_offset = (distance_m * math.sin(angle)) / (
        METERS_PER_DEGREE_LAT * math.cos(math.radians(latitude))
    )

    return latitude + lat_offset, longitude + lng_offset


def haversine_distance_meters(
    lat1: float, lng1: float, lat2: float, lng2: float
) -> float:
    earth_radius_m = 6_371_000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return earth_radius_m * c
