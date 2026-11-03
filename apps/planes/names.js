// Plain names for the codes aircraft broadcast. The list and the plane labels
// draw from these so they never have to ask a server. Anything not here shows
// its code as sent; tapping a plane looks up its full details.

export const AIRLINES = {
  AAL: 'American', AAY: 'Allegiant', ABR: 'ASL Airlines', ACA: 'Air Canada', AFR: 'Air France', AIC: 'Air India',
  AMX: 'Aeroméxico', ANA: 'ANA', ASA: 'Alaska', ASH: 'Mesa', AUA: 'Austrian', AZA: 'ITA Airways', BAW: 'British Airways',
  BCS: 'DHL', BEL: 'Brussels Airlines', CAL: 'China Airlines', CCA: 'Air China', CES: 'China Eastern', CLX: 'Cargolux',
  CPA: 'Cathay Pacific', CPZ: 'Compass', CSN: 'China Southern', DAL: 'Delta', DHK: 'DHL', DLH: 'Lufthansa',
  EDV: 'Endeavor', EIN: 'Aer Lingus', EJA: 'NetJets', EJU: 'easyJet', ENY: 'Envoy', ETD: 'Etihad', ETH: 'Ethiopian',
  EVA: 'EVA Air', EZS: 'easyJet', EZY: 'easyJet', FDX: 'FedEx', FFT: 'Frontier', FIN: 'Finnair', GJS: 'GoJet',
  GTI: 'Atlas Air', HAL: 'Hawaiian', HVN: 'Vietnam Airlines', IBE: 'Iberia', ICE: 'Icelandair', ITY: 'ITA Airways',
  JAL: 'Japan Airlines', JBU: 'JetBlue', JIA: 'PSA Airlines', JZA: 'Jazz', KAL: 'Korean Air', KLM: 'KLM', LOT: 'LOT',
  LXJ: 'Flexjet', MXY: 'Breeze', NAX: 'Norwegian', NKS: 'Spirit', NOZ: 'Norwegian', POE: 'Porter', QFA: 'Qantas',
  QTR: 'Qatar Airways', QXE: 'Horizon', ROU: 'Air Canada Rouge', RPA: 'Republic', RYR: 'Ryanair', SAS: 'SAS',
  SCX: 'Sun Country', SIA: 'Singapore Airlines', SKW: 'SkyWest', SWA: 'Southwest', SWR: 'Swiss', TAP: 'TAP',
  THA: 'Thai', THY: 'Turkish Airlines', TOM: 'TUI', TSC: 'Air Transat', UAE: 'Emirates', UAL: 'United', UPS: 'UPS',
  VIR: 'Virgin Atlantic', VLG: 'Vueling', VOI: 'Volaris', VOZ: 'Virgin Australia', WJA: 'WestJet', WZZ: 'Wizz Air',
};

export const TYPES = {
  A19N: 'Airbus A319neo', A20N: 'Airbus A320neo', A21N: 'Airbus A321neo', A306: 'Airbus A300', A318: 'Airbus A318',
  A319: 'Airbus A319', A320: 'Airbus A320', A321: 'Airbus A321', A332: 'Airbus A330-200', A333: 'Airbus A330-300',
  A339: 'Airbus A330-900', A343: 'Airbus A340-300', A346: 'Airbus A340-600', A359: 'Airbus A350-900', A35K: 'Airbus A350-1000',
  A388: 'Airbus A380', BCS1: 'Airbus A220-100', BCS3: 'Airbus A220-300',
  B38M: 'Boeing 737 MAX 8', B39M: 'Boeing 737 MAX 9', B734: 'Boeing 737-400', B737: 'Boeing 737-700', B738: 'Boeing 737-800',
  B739: 'Boeing 737-900', B744: 'Boeing 747-400', B748: 'Boeing 747-8', B752: 'Boeing 757-200', B753: 'Boeing 757-300',
  B762: 'Boeing 767-200', B763: 'Boeing 767-300', B764: 'Boeing 767-400', B772: 'Boeing 777-200', B77L: 'Boeing 777-200LR',
  B77W: 'Boeing 777-300ER', B788: 'Boeing 787-8', B789: 'Boeing 787-9', B78X: 'Boeing 787-10', MD11: 'McDonnell Douglas MD-11',
  E170: 'Embraer E170', E75L: 'Embraer E175', E75S: 'Embraer E175', E190: 'Embraer E190', E195: 'Embraer E195',
  E290: 'Embraer E190-E2', E295: 'Embraer E195-E2', CRJ2: 'Bombardier CRJ200', CRJ7: 'Bombardier CRJ700',
  CRJ9: 'Bombardier CRJ900', CRJX: 'Bombardier CRJ1000', AT72: 'ATR 72', AT75: 'ATR 72-500', AT76: 'ATR 72-600',
  DH8A: 'Dash 8-100', DH8B: 'Dash 8-200', DH8C: 'Dash 8-300', DH8D: 'Dash 8-400',
  C172: 'Cessna 172', C182: 'Cessna 182', C208: 'Cessna Caravan', C25A: 'Citation CJ2', C25B: 'Citation CJ3', C25C: 'Citation CJ4',
  C510: 'Citation Mustang', C56X: 'Citation Excel', C68A: 'Citation Latitude', C700: 'Citation Longitude',
  BE20: 'King Air 200', BE36: 'Bonanza 36', CL30: 'Challenger 300', CL35: 'Challenger 350', E50P: 'Phenom 100', E55P: 'Phenom 300',
  F2TH: 'Falcon 2000', FA7X: 'Falcon 7X', GL5T: 'Global 5000', GLEX: 'Global Express', GLF4: 'Gulfstream IV', GLF5: 'Gulfstream V',
  GLF6: 'Gulfstream G650', H25B: 'Hawker 800', LJ45: 'Learjet 45', P28A: 'Piper Cherokee', PA28: 'Piper Cherokee', PC12: 'Pilatus PC-12',
  SR20: 'Cirrus SR20', SR22: 'Cirrus SR22', A139: 'Leonardo AW139', AS50: 'Airbus H125', B06: 'Bell 206', B407: 'Bell 407',
  EC30: 'Airbus H130', EC35: 'Airbus H135', EC45: 'Airbus H145', H60: 'Black Hawk', R44: 'Robinson R44',
};

const CATEGORY = { A1: 'Light aircraft', A2: 'Small aircraft', A3: 'Airliner', A4: 'Large airliner', A5: 'Heavy airliner', A6: 'Fast jet', A7: 'Helicopter', B1: 'Glider', B2: 'Balloon', B4: 'Ultralight', B6: 'Drone' };

// "SKW3883" -> "SkyWest 3883"; a callsign that isn't an airline's stays as sent
export function flightName(callsign, registration, hex) {
  const m = /^([A-Z]{3})(\d[0-9A-Z]*)$/.exec(callsign || '');
  if (m && AIRLINES[m[1]]) return `${AIRLINES[m[1]]} ${m[2]}`;
  return callsign || registration || hex.replace(/^~/, '').toUpperCase();
}

export const typeName = (type, category) => TYPES[type] || type || CATEGORY[category] || 'Aircraft';
