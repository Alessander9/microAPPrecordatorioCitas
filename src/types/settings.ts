export interface AppSettingRecord {
  key: string;
  value: any;
}

export interface SettingsState {
  hasPin: boolean;
  messageTemplate: string;
  deviceId: string;
  deviceSecret: string;
  pushEnabled: boolean;
  theme: 'system' | 'light' | 'dark';
}

export const DEFAULT_MESSAGE_TEMPLATE = 
  "Hola {nombre}, te escribo para recordarte que tu próxima sesión de terapia es el {fecha}. ¿Te confirmo el horario?";
