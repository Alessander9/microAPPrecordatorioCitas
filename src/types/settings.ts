export interface AppSettingRecord {
  key: string;
  value: any;
}

export interface SettingsState {
  hasPin: boolean;
  therapistName: string;
  messageTemplate: string;
  deviceId: string;
  deviceSecret: string;
  pushEnabled: boolean;
  theme: 'system' | 'light' | 'dark';
}

export const DEFAULT_THERAPIST_NAME = "tu terapeuta";

export const DEFAULT_MESSAGE_TEMPLATE = 
  "Hola {nombre}, te saluda tu terapeuta. Te escribo para coordinar tu próxima sesión del tratamiento programada para el {fecha}. ¿Me confirmas si te queda bien el horario?";

export const MESSAGE_PRESETS = [
  {
    title: "Tratamiento y confirmación",
    template: "Hola {nombre}, te saluda {terapeuta}. Te escribo para coordinar tu próxima sesión del tratamiento programada para el {fecha}. ¿Me confirmas si te queda bien el horario?"
  },
  {
    title: "Seguimiento cercano",
    template: "Hola {nombre}, ¿cómo estás? Te saluda {terapeuta}. Quería saber cómo vas con tu tratamiento y recordarte que nuestra próxima sesión es el {fecha}. ¿Confirmamos el horario?"
  },
  {
    title: "Breve y formal",
    template: "Hola {nombre}, te saluda {terapeuta}. Te recordamos tu cita de tratamiento programada para el {fecha}. Por favor confírmanos tu asistencia."
  }
];
