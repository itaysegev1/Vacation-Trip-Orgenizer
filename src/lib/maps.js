import config from '../config/tripConfig';

// Build a maps URL from the configured template (infra.mapsUrlTemplate), so the
// maps provider is white-label / swappable. The {query} token is URL-encoded.
// Default opens the device's native maps app (Google Maps universal URL).
const TEMPLATE = config.infra.mapsUrlTemplate;

export const mapsUrl = (query) => TEMPLATE.replace('{query}', encodeURIComponent(query));
