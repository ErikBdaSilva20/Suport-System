export interface AppSettings {
  id: string;
  companyName: string;
  companyLogoUrl?: string | null;
  timezone: string;
  businessHoursStart: string; // formato 'HH:MM'
  businessHoursEnd: string;
  businessDays: number[]; // 1=Seg, 7=Dom
  supportEmail: string;
  appBaseUrl?: string | null;
  primaryColor: string;
  resendFromEmail?: string | null;
}
