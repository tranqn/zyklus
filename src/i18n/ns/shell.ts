import { ns } from '../define'

/** App shell, navigation and shared widgets. */
export const shell = ns({
  de: {
    nav: { today: 'Heute', plan: 'Plan', nutrition: 'Ernährung', progress: 'Fortschritt', more: 'Mehr', main: 'Hauptnavigation' },
    a11y: { decrease: '{label} verringern', increase: '{label} erhöhen', close: 'Schließen' },
    anim: { label: 'Animation: {name}', pause: 'Animation anhalten', play: 'Animation abspielen' },
  },
  en: {
    nav: { today: 'Today', plan: 'Plan', nutrition: 'Nutrition', progress: 'Progress', more: 'More', main: 'Main navigation' },
    a11y: { decrease: 'Decrease {label}', increase: 'Increase {label}', close: 'Close' },
    anim: { label: 'Animation: {name}', pause: 'Pause animation', play: 'Play animation' },
  },
  vi: {
    nav: { today: 'Hôm nay', plan: 'Giáo án', nutrition: 'Dinh dưỡng', progress: 'Tiến bộ', more: 'Thêm', main: 'Điều hướng chính' },
    a11y: { decrease: 'Giảm {label}', increase: 'Tăng {label}', close: 'Đóng' },
    anim: { label: 'Hoạt ảnh: {name}', pause: 'Tạm dừng hoạt ảnh', play: 'Phát hoạt ảnh' },
  },
})
