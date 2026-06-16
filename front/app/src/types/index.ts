export interface Copyright {
  id: number;
  company: string;
  logoUrl: string;
  createdAt: string;
}

export interface WatermarkResult {
  watermarkedImage: string;
  psnr: number;
  ssim: number;
  residualImage: string;
  maxDiff: number;
  meanDiff: number;
}

export interface TamperRegion {
  id: string;
  bbox: [number, number, number, number];
  color: [number, number, number];
  area: number;
}

export interface WatermarkExtract {
  detected: boolean;
  status: string;
  logoId: number | null;
  company: string;
  logoImage: string | null;
  confidence: number;
  rawBits: string;
  bitErrors: number;
}

export interface ForensicsResult {
  locationImage: string;
  tamperedRegions: TamperRegion[];
  watermark: WatermarkExtract;
  processingTime: number;
  modelUsed: string;
}

export interface AttackRecord {
  id: string;
  type: string;
  params: Record<string, any>;
  timestamp: string;
  watermarkDetected: boolean;
  imageUrl: string;
}

export interface AlertItem {
  id: string;
  title: string;
  level: 'critical' | 'warning' | 'info';
  timestamp: string;
  source: string;
  status: 'pending' | 'resolved' | 'false_positive' | 'archived';
  thumbnail: string;
  regionCount: number;
  confidence: number;
}

export interface ReportItem {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  pageCount: number;
  downloadUrl: string;
  content: string;
}

export interface DashboardStats {
  copyrightCount: number;
  detectionCount: number;
  alertCount: number;
  uptime: string;
  todayDetections: number;
  weekAlerts: number;
}

export interface NavItem {
  icon: string;
  label: string;
  labelEn: string;
  path: string;
  admin?: boolean;
}
