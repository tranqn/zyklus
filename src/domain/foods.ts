import type { Lang } from '../i18n/lang'
import type { Food } from './types'

/**
 * Built-in foods, values per 100 g as orientation (Bundeslebensmittelschlüssel, USDA, and for
 * Vietnamese dishes the Vietnamese food composition table of the Viện Dinh dưỡng Quốc gia).
 * Every food has a name in all three languages; `region` marks dishes typical for one cuisine,
 * which the search ranks first in that language.
 */
type Row = {
  id: string
  n: [de: string, en: string, vi: string]
  m: [kcal: number, protein: number, carbs: number, fat: number]
  /** default portion in g and its label per language */
  p?: [grams: number, de?: string, en?: string, vi?: string]
  /** a different portion for Vietnamese users (e.g. 1 chén rice = 150 g) */
  pvi?: [grams: number, label: string]
  region?: 'de' | 'vi'
  /** extra search words, e.g. "cơm" for plain cooked rice */
  aka?: string[]
}

const ROWS: Row[] = [
  // Fleisch, Fisch, Eier
  { id: 'haehnchenschenkel', n: ['Hähnchenschenkel ohne Haut (roh)', 'Chicken thigh, skinless (raw)', 'Đùi gà bỏ da (sống)'], m: [120, 19.5, 0, 4.5], p: [130, '1 Schenkel', '1 thigh', '1 cái'] },
  { id: 'rind-mager', n: ['Rindfleisch mager, Hüfte (roh)', 'Lean beef, rump (raw)', 'Thịt bò nạc (sống)'], m: [115, 22, 0, 3], p: [125] },
  { id: 'haehnchenbrust', n: ['Hähnchenbrust (roh)', 'Chicken breast (raw)', 'Ức gà (sống)'], m: [110, 23, 0, 1.5], p: [150, '1 Filet', '1 fillet', '1 miếng'] },
  { id: 'putenbrust', n: ['Putenbrust (roh)', 'Turkey breast (raw)', 'Ức gà tây (sống)'], m: [105, 24, 0, 1], p: [150, '1 Filet', '1 fillet', '1 miếng'] },
  { id: 'rinderhack', n: ['Rinderhack (roh)', 'Ground beef (raw)', 'Thịt bò xay (sống)'], m: [250, 18, 0, 20], p: [125] },
  { id: 'rinderhack-mager', n: ['Rinderhack mager 5 % (roh)', 'Lean ground beef 5% (raw)', 'Thịt bò xay nạc 5% (sống)'], m: [125, 21, 0, 5], p: [125] },
  { id: 'rindersteak', n: ['Rindersteak (roh)', 'Beef steak (raw)', 'Thịt bò bít tết (sống)'], m: [130, 22, 0, 4.5], p: [200, '1 Steak', '1 steak', '1 miếng'] },
  { id: 'schweinefilet', n: ['Schweinefilet (roh)', 'Pork tenderloin (raw)', 'Thịt thăn heo (sống)'], m: [120, 21, 0, 4], p: [150] },
  { id: 'lachs', n: ['Lachs (roh)', 'Salmon (raw)', 'Cá hồi (sống)'], m: [200, 20, 0, 13], p: [125, '1 Filet', '1 fillet', '1 miếng'] },
  { id: 'thunfisch-dose', n: ['Thunfisch im eigenen Saft', 'Tuna in water (canned)', 'Cá ngừ ngâm nước (hộp)'], m: [115, 26, 0, 1], p: [130, '1 Dose', '1 can', '1 hộp'] },
  { id: 'kabeljau', n: ['Kabeljau (roh)', 'Cod (raw)', 'Cá tuyết (sống)'], m: [80, 18, 0, 0.7], p: [150] },
  { id: 'garnelen', n: ['Garnelen (roh)', 'Shrimp (raw)', 'Tôm (sống)'], m: [85, 19, 0, 1], p: [100] },
  { id: 'ei', aka: ['trứng'], n: ['Ei (Hühnerei)', 'Egg', 'Trứng gà'], m: [145, 12.5, 0.7, 10], p: [60, '1 Ei', '1 egg', '1 quả'] },
  { id: 'eiklar', n: ['Eiklar', 'Egg white', 'Lòng trắng trứng'], m: [50, 11, 0.7, 0.2], p: [33, '1 Eiklar', '1 egg white', '1 lòng trắng'] },
  { id: 'kochschinken', n: ['Kochschinken', 'Cooked ham', 'Giăm bông'], m: [110, 19, 1, 3.5], p: [20, '1 Scheibe', '1 slice', '1 lát'], region: 'de' },
  { id: 'salami', n: ['Salami', 'Salami', 'Xúc xích Ý (salami)'], m: [380, 22, 1, 32], p: [10, '1 Scheibe', '1 slice', '1 lát'], region: 'de' },
  // Milchprodukte
  { id: 'milch-laktosefrei', n: ['Laktosefreie Milch 1,5 %', 'Lactose-free milk 1.5%', 'Sữa không lactose 1,5%'], m: [47, 3.4, 4.8, 1.5], p: [250, '1 Glas', '1 glass', '1 ly'] },
  { id: 'skyr-laktosefrei', n: ['Skyr laktosefrei', 'Lactose-free skyr', 'Skyr không lactose'], m: [63, 11, 4, 0.2], p: [150, '1 Portion', '1 serving', '1 phần'] },
  { id: 'magerquark-laktosefrei', n: ['Magerquark laktosefrei', 'Lactose-free quark', 'Phô mai quark không lactose'], m: [67, 12, 4, 0.3], p: [250] },
  { id: 'sojajoghurt', n: ['Sojajoghurt natur', 'Plain soy yogurt', 'Sữa chua đậu nành'], m: [50, 4, 2, 2.3], p: [150] },
  { id: 'magerquark', n: ['Magerquark', 'Low-fat quark', 'Phô mai tươi ít béo (quark)'], m: [67, 12, 4, 0.3], p: [250, '1 Becher', '1 tub', '1 hộp'], region: 'de' },
  { id: 'skyr', n: ['Skyr natur', 'Skyr (plain)', 'Sữa chua Skyr không đường'], m: [63, 11, 4, 0.2], p: [150, '1 Portion', '1 serving', '1 phần'] },
  { id: 'griech-joghurt', n: ['Griechischer Joghurt 10 %', 'Greek yoghurt 10%', 'Sữa chua Hy Lạp 10%'], m: [120, 4, 4, 10], p: [150] },
  { id: 'joghurt-15', n: ['Naturjoghurt 1,5 %', 'Plain yoghurt 1.5%', 'Sữa chua không đường 1,5%'], m: [47, 3.5, 4.5, 1.5], p: [150] },
  { id: 'huettenkaese', n: ['Hüttenkäse', 'Cottage cheese', 'Phô mai cottage'], m: [98, 12, 2, 4.5], p: [200, '1 Becher', '1 tub', '1 hộp'] },
  { id: 'milch-15', n: ['Milch 1,5 %', 'Milk 1.5%', 'Sữa tươi ít béo 1,5%'], m: [47, 3.4, 4.9, 1.5], p: [250, '1 Glas', '1 glass', '1 ly'] },
  { id: 'milch-35', n: ['Vollmilch 3,5 %', 'Whole milk 3.5%', 'Sữa tươi nguyên kem 3,5%'], m: [64, 3.3, 4.8, 3.5], p: [250, '1 Glas', '1 glass', '1 ly'] },
  { id: 'gouda', n: ['Gouda', 'Gouda', 'Phô mai Gouda'], m: [360, 25, 0, 29], p: [25, '1 Scheibe', '1 slice', '1 lát'], region: 'de' },
  { id: 'mozzarella', n: ['Mozzarella', 'Mozzarella', 'Phô mai Mozzarella'], m: [250, 18, 1, 19], p: [125, '1 Kugel', '1 ball', '1 viên'] },
  { id: 'mozzarella-light', n: ['Mozzarella light', 'Light mozzarella', 'Phô mai Mozzarella ít béo'], m: [165, 20, 1, 9], p: [125, '1 Kugel', '1 ball', '1 viên'] },
  { id: 'feta', n: ['Feta', 'Feta', 'Phô mai Feta'], m: [265, 17, 0.5, 21], p: [50] },
  { id: 'harzer', n: ['Harzer Käse', 'Harzer cheese', 'Phô mai Harzer'], m: [115, 27, 0, 0.5], p: [50], region: 'de' },
  { id: 'butter', n: ['Butter', 'Butter', 'Bơ lạt'], m: [740, 0.7, 0.6, 82], p: [10, '1 Portion', '1 pat', '1 phần'] },
  { id: 'proteinpulver', n: ['Whey Proteinpulver', 'Whey protein powder', 'Bột Whey protein'], m: [380, 78, 6, 5], p: [30, '1 Messlöffel', '1 scoop', '1 muỗng'] },
  { id: 'sojaprotein', n: ['Sojaprotein-Isolat (Pulver)', 'Soy protein isolate (powder)', 'Bột đạm đậu nành'], m: [370, 86, 2, 2], p: [30, '1 Messlöffel', '1 scoop', '1 muỗng'] },
  // Getreide, Beilagen
  { id: 'reisnudeln-roh', aka: ['bánh phở khô'], n: ['Reisnudeln (trocken)', 'Rice noodles (dry)', 'Bún / bánh phở khô'], m: [360, 6, 80, 0.6], p: [90, '1 Portion', '1 serving', '1 phần'] },
  { id: 'speisestaerke', n: ['Speisestärke', 'Cornstarch', 'Bột năng / bột bắp'], m: [350, 0.3, 86, 0.1], p: [10, '1 EL', '1 tbsp', '1 muỗng canh'] },
  { id: 'haferflocken', n: ['Haferflocken', 'Rolled oats', 'Yến mạch'], m: [370, 13.5, 59, 7], p: [50, '1 Portion', '1 serving', '1 phần'] },
  { id: 'reis-roh', n: ['Reis (roh)', 'Rice (uncooked)', 'Gạo (sống)'], m: [350, 7, 78, 0.6], p: [75, '1 Portion', '1 serving', '1 phần'] },
  { id: 'reis-gekocht', n: ['Reis (gekocht)', 'Rice (cooked)', 'Cơm trắng'], m: [130, 2.7, 28, 0.3], p: [200], pvi: [150, '1 chén'], aka: ['cơm', 'rice', 'Reis'] },
  { id: 'nudeln-roh', n: ['Nudeln (roh)', 'Pasta (uncooked)', 'Mì Ý (sống)'], m: [355, 12.5, 70, 1.5], p: [100, '1 Portion', '1 serving', '1 phần'] },
  { id: 'nudeln-gekocht', n: ['Nudeln (gekocht)', 'Pasta (cooked)', 'Mì Ý (đã nấu)'], m: [150, 5.5, 30, 0.8], p: [250] },
  { id: 'vollkornnudeln-roh', n: ['Vollkornnudeln (roh)', 'Wholegrain pasta (uncooked)', 'Mì Ý nguyên cám (sống)'], m: [340, 14, 62, 2.5], p: [100] },
  { id: 'kartoffeln', n: ['Kartoffeln (gekocht)', 'Potatoes (boiled)', 'Khoai tây luộc'], m: [75, 2, 16, 0.1], p: [200] },
  { id: 'suesskartoffel', n: ['Süßkartoffel (roh)', 'Sweet potato (raw)', 'Khoai lang (sống)'], m: [86, 1.6, 20, 0.1], p: [200], pvi: [200, '1 củ'] },
  { id: 'vollkornbrot', n: ['Vollkornbrot', 'Wholegrain bread', 'Bánh mì nguyên cám'], m: [220, 7, 40, 1.5], p: [50, '1 Scheibe', '1 slice', '1 lát'], region: 'de' },
  { id: 'toast', n: ['Toastbrot', 'Toast bread', 'Bánh mì sandwich'], m: [260, 8, 48, 3.5], p: [25, '1 Scheibe', '1 slice', '1 lát'] },
  { id: 'broetchen', n: ['Brötchen (Weizen)', 'Bread roll (wheat)', 'Bánh mì tròn (lúa mì)'], m: [255, 9, 50, 1.5], p: [55, '1 Brötchen', '1 roll', '1 cái'], region: 'de' },
  { id: 'knaeckebrot', n: ['Knäckebrot', 'Crispbread', 'Bánh mì giòn (crispbread)'], m: [350, 10, 66, 2], p: [10, '1 Scheibe', '1 slice', '1 miếng'], region: 'de' },
  { id: 'couscous-roh', n: ['Couscous (roh)', 'Couscous (uncooked)', 'Couscous (sống)'], m: [360, 12, 72, 2], p: [75] },
  { id: 'quinoa-roh', n: ['Quinoa (roh)', 'Quinoa (uncooked)', 'Diêm mạch quinoa (sống)'], m: [365, 14, 64, 6], p: [75] },
  { id: 'wraps', n: ['Weizen-Wrap', 'Wheat wrap', 'Bánh tráng lúa mì (wrap)'], m: [300, 8.5, 50, 7], p: [60, '1 Wrap', '1 wrap', '1 cái'] },
  { id: 'reiswaffel', n: ['Reiswaffel', 'Rice cake', 'Bánh gạo'], m: [385, 8, 81, 3], p: [8, '1 Waffel', '1 cake', '1 cái'] },
  { id: 'cornflakes', n: ['Cornflakes', 'Cornflakes', 'Ngũ cốc cornflakes'], m: [375, 7, 84, 0.9], p: [40] },
  { id: 'muesli', n: ['Müsli (ungezuckert)', 'Muesli (unsweetened)', 'Ngũ cốc muesli không đường'], m: [360, 10, 60, 7], p: [50] },
  // Hülsenfrüchte, Soja
  { id: 'linsen-braun-roh', n: ['Braune / Beluga-Linsen (roh)', 'Brown / beluga lentils (dry)', 'Đậu lăng nâu / đen (khô)'], m: [330, 24, 48, 1.5], p: [60] },
  { id: 'weisse-bohnen-dose', n: ['Weiße Bohnen (Dose, abgetropft)', 'White beans (canned, drained)', 'Đậu trắng (đóng hộp, để ráo)'], m: [90, 6.5, 12, 0.5], p: [120] },
  { id: 'linsen-roh', n: ['Rote Linsen (roh)', 'Red lentils (uncooked)', 'Đậu lăng đỏ (sống)'], m: [340, 25, 50, 1.5], p: [75] },
  { id: 'kichererbsen-dose', n: ['Kichererbsen (Dose, abgetropft)', 'Chickpeas (canned, drained)', 'Đậu gà (hộp, để ráo)'], m: [120, 7, 16, 2.5], p: [120] },
  { id: 'kidneybohnen-dose', n: ['Kidneybohnen (Dose)', 'Kidney beans (canned)', 'Đậu đỏ tây (hộp)'], m: [95, 7, 13, 0.5], p: [120] },
  { id: 'tofu', n: ['Tofu natur', 'Tofu (plain)', 'Đậu hũ (đậu phụ)'], aka: ['đậu phụ', 'đậu hũ'], m: [125, 13, 2, 7.5], p: [200, '1 Block', '1 block', '1 bìa'], pvi: [150, '1 bìa'] },
  { id: 'tempeh', n: ['Tempeh', 'Tempeh', 'Tempeh (đậu nành lên men)'], m: [195, 19, 9, 11], p: [100] },
  { id: 'edamame', n: ['Edamame', 'Edamame', 'Đậu nành Nhật (edamame)'], m: [120, 11, 9, 5], p: [100] },
  // Gemüse
  { id: 'blumenkohl', n: ['Blumenkohl', 'Cauliflower', 'Súp lơ trắng'], m: [23, 2, 2.5, 0.3], p: [150] },
  { id: 'gruene-bohnen', n: ['Grüne Bohnen', 'Green beans', 'Đậu que'], m: [25, 1.8, 4.3, 0.2], p: [100] },
  { id: 'kimchi', n: ['Kimchi', 'Kimchi', 'Kim chi'], m: [15, 1.1, 2.4, 0.5], p: [50] },
  { id: 'brokkoli', n: ['Brokkoli', 'Broccoli', 'Bông cải xanh'], m: [34, 3, 3, 0.4], p: [200] },
  { id: 'spinat', n: ['Spinat', 'Spinach', 'Rau chân vịt (cải bó xôi)'], m: [23, 2.9, 1, 0.4], p: [100] },
  { id: 'paprika', n: ['Paprika', 'Bell pepper', 'Ớt chuông'], m: [30, 1, 5, 0.3], p: [150, '1 Paprika', '1 pepper', '1 quả'] },
  { id: 'tomate', n: ['Tomate', 'Tomato', 'Cà chua'], m: [18, 0.9, 2.6, 0.2], p: [80, '1 Tomate', '1 tomato', '1 quả'] },
  { id: 'gurke', n: ['Gurke', 'Cucumber', 'Dưa leo'], m: [13, 0.6, 1.8, 0.2], p: [150], pvi: [150, '1 quả'] },
  { id: 'karotte', n: ['Karotte', 'Carrot', 'Cà rốt'], m: [36, 0.9, 7, 0.2], p: [80, '1 Karotte', '1 carrot', '1 củ'] },
  { id: 'zucchini', n: ['Zucchini', 'Courgette', 'Bí ngòi'], m: [20, 1.6, 2, 0.4], p: [200] },
  { id: 'champignons', n: ['Champignons', 'Mushrooms', 'Nấm mỡ'], m: [22, 3, 0.6, 0.3], p: [150] },
  { id: 'salat', n: ['Blattsalat', 'Lettuce', 'Xà lách'], m: [15, 1.3, 1.5, 0.2], p: [80] },
  { id: 'zwiebel', n: ['Zwiebel', 'Onion', 'Hành tây'], m: [33, 1.2, 6, 0.3], p: [60, '1 Zwiebel', '1 onion', '1 củ'] },
  { id: 'mais-dose', n: ['Mais (Dose)', 'Sweetcorn (canned)', 'Bắp ngô (hộp)'], m: [85, 2.8, 15, 1.2], p: [140] },
  { id: 'erbsen', n: ['Erbsen (TK)', 'Peas (frozen)', 'Đậu Hà Lan (đông lạnh)'], m: [80, 6, 11, 0.5], p: [150] },
  { id: 'tk-gemuese', n: ['TK-Gemüsemischung', 'Frozen mixed vegetables', 'Rau củ trộn đông lạnh'], m: [45, 2.5, 6, 0.5], p: [200] },
  // Obst
  { id: 'orangensaft', n: ['Orangensaft', 'Orange juice', 'Nước cam'], m: [45, 0.7, 9, 0.2], p: [200, '1 Glas', '1 glass', '1 ly'] },
  { id: 'banane', n: ['Banane', 'Banana', 'Chuối'], m: [95, 1.1, 21, 0.3], p: [120, '1 Banane', '1 banana', '1 quả'] },
  { id: 'apfel', n: ['Apfel', 'Apple', 'Táo'], m: [55, 0.3, 12, 0.2], p: [150, '1 Apfel', '1 apple', '1 quả'] },
  { id: 'beeren-tk', n: ['Beerenmischung (TK)', 'Mixed berries (frozen)', 'Quả mọng trộn (đông lạnh)'], m: [45, 1, 8, 0.4], p: [150] },
  { id: 'heidelbeeren', n: ['Heidelbeeren', 'Blueberries', 'Việt quất'], m: [45, 0.6, 7.4, 0.6], p: [125] },
  { id: 'orange', n: ['Orange', 'Orange', 'Cam'], m: [45, 1, 9, 0.2], p: [180, '1 Orange', '1 orange', '1 quả'] },
  { id: 'kiwi', n: ['Kiwi', 'Kiwi', 'Kiwi'], m: [60, 1, 11, 0.6], p: [75, '1 Kiwi', '1 kiwi', '1 quả'] },
  { id: 'weintrauben', n: ['Weintrauben', 'Grapes', 'Nho'], m: [70, 0.7, 16, 0.3], p: [125] },
  { id: 'datteln', n: ['Datteln (getrocknet)', 'Dates (dried)', 'Chà là khô'], m: [290, 2, 65, 0.5], p: [8, '1 Dattel', '1 date', '1 quả'] },
  // Fette, Nüsse
  { id: 'sesam', n: ['Sesam', 'Sesame seeds', 'Mè (vừng)'], m: [570, 18, 12, 50], p: [10, '1 EL', '1 tbsp', '1 muỗng canh'] },
  { id: 'cashew', n: ['Cashewkerne', 'Cashews', 'Hạt điều'], m: [580, 18, 27, 44], p: [30, '1 Handvoll', '1 handful', '1 nắm'] },
  { id: 'leinsamen', n: ['Leinsamen (geschrotet)', 'Flaxseed (ground)', 'Hạt lanh (xay)'], m: [490, 18, 1.6, 42], p: [10, '1 EL', '1 tbsp', '1 muỗng canh'] },
  { id: 'hanfsamen', n: ['Hanfsamen (geschält)', 'Hemp hearts', 'Hạt gai dầu (bóc vỏ)'], m: [560, 31, 4.7, 49], p: [10, '1 EL', '1 tbsp', '1 muỗng canh'] },
  { id: 'kokosmilch', n: ['Kokosmilch', 'Coconut milk', 'Nước cốt dừa'], m: [190, 1.8, 3, 20], p: [100] },
  { id: 'kokosmilch-light', n: ['Kokosmilch light', 'Light coconut milk', 'Nước cốt dừa ít béo'], m: [75, 0.7, 2, 7], p: [100] },
  { id: 'olivenoel', n: ['Olivenöl', 'Olive oil', 'Dầu ô liu'], m: [880, 0, 0, 100], p: [10, '1 EL', '1 tbsp', '1 muỗng canh'] },
  { id: 'rapsoel', n: ['Rapsöl', 'Rapeseed oil', 'Dầu ăn (dầu hạt cải)'], m: [880, 0, 0, 100], p: [10, '1 EL', '1 tbsp', '1 muỗng canh'] },
  { id: 'erdnussbutter', n: ['Erdnussbutter', 'Peanut butter', 'Bơ đậu phộng'], m: [600, 25, 14, 49], p: [15, '1 EL', '1 tbsp', '1 muỗng canh'] },
  { id: 'mandeln', n: ['Mandeln', 'Almonds', 'Hạnh nhân'], m: [600, 21, 6, 53], p: [30, '1 Handvoll', '1 handful', '1 nắm'] },
  { id: 'walnuesse', n: ['Walnüsse', 'Walnuts', 'Óc chó'], m: [680, 15, 7, 65], p: [30, '1 Handvoll', '1 handful', '1 nắm'] },
  { id: 'avocado', n: ['Avocado', 'Avocado', 'Bơ (quả)'], m: [160, 2, 3.5, 15], p: [150, '1 Avocado', '1 avocado', '1 quả'] },
  { id: 'chiasamen', n: ['Chiasamen', 'Chia seeds', 'Hạt chia'], m: [490, 17, 8, 31], p: [15, '1 EL', '1 tbsp', '1 muỗng canh'] },
  // Snacks, Sonstiges
  { id: 'sojasauce', aka: ['xì dầu', 'nước tương'], n: ['Sojasauce', 'Soy sauce', 'Xì dầu (nước tương)'], m: [53, 8, 5, 0.6], p: [15, '1 EL', '1 tbsp', '1 muỗng canh'] },
  { id: 'austernsauce', n: ['Austernsauce', 'Oyster sauce', 'Dầu hào'], m: [51, 1.4, 11, 0.3], p: [15, '1 EL', '1 tbsp', '1 muỗng canh'] },
  { id: 'gochujang', n: ['Gochujang (Chilipaste)', 'Gochujang (chili paste)', 'Tương ớt Gochujang'], m: [230, 6, 40, 2.3], p: [15, '1 EL', '1 tbsp', '1 muỗng canh'] },
  { id: 'doubanjiang', n: ['Doubanjiang (Bohnen-Chilipaste)', 'Doubanjiang (chili bean paste)', 'Tương đậu ớt Tứ Xuyên'], m: [150, 8, 12, 8], p: [15, '1 EL', '1 tbsp', '1 muỗng canh'] },
  { id: 'misopaste', n: ['Misopaste', 'Miso paste', 'Tương miso'], m: [200, 12, 26, 6], p: [15, '1 EL', '1 tbsp', '1 muỗng canh'] },
  { id: 'mirin', n: ['Mirin (süßer Reiswein)', 'Mirin (sweet rice wine)', 'Rượu mirin'], m: [240, 0.3, 43, 0], p: [15, '1 EL', '1 tbsp', '1 muỗng canh'] },
  { id: 'bruehe', n: ['Brühe (zubereitet)', 'Broth (prepared)', 'Nước dùng'], m: [6, 0.6, 0.5, 0.2], p: [250] },
  { id: 'zucker', n: ['Zucker', 'Sugar', 'Đường'], m: [400, 0, 100, 0], p: [5, '1 TL', '1 tsp', '1 muỗng cà phê'] },
  { id: 'ahornsirup', n: ['Ahornsirup', 'Maple syrup', 'Siro lá phong'], m: [260, 0, 67, 0], p: [10, '1 TL', '1 tsp', '1 muỗng cà phê'] },
  { id: 'kakao', n: ['Kakaopulver (ungesüßt)', 'Cocoa powder (unsweetened)', 'Bột ca cao (không đường)'], m: [360, 20, 11, 11], p: [5, '1 TL', '1 tsp', '1 muỗng cà phê'] },
  { id: 'zartbitter', n: ['Zartbitterschokolade 70 %', 'Dark chocolate 70%', 'Sô cô la đen 70%'], m: [570, 9, 33, 43], p: [20, '2 Stück', '2 pieces', '2 miếng'] },
  { id: 'proteinriegel', n: ['Proteinriegel', 'Protein bar', 'Thanh protein'], m: [360, 33, 30, 12], p: [60, '1 Riegel', '1 bar', '1 thanh'] },
  { id: 'honig', n: ['Honig', 'Honey', 'Mật ong'], m: [305, 0.4, 76, 0], p: [20, '1 TL', '1 tsp', '1 muỗng'] },
  { id: 'marmelade', n: ['Konfitüre', 'Jam', 'Mứt'], m: [240, 0.4, 59, 0.1], p: [20, '1 TL', '1 tsp', '1 muỗng'] },
  { id: 'pizza-tk', n: ['Tiefkühlpizza Margherita', 'Frozen pizza margherita', 'Pizza đông lạnh Margherita'], m: [230, 9.5, 29, 8], p: [350, '1 Pizza', '1 pizza', '1 cái'] },
  { id: 'doener', n: ['Döner Kebab', 'Doner kebab', 'Bánh mì Doner Kebab'], m: [215, 12, 20, 9.5], p: [400, '1 Döner', '1 doner', '1 cái'], region: 'de' },
  { id: 'pommes', n: ['Pommes frites', 'French fries', 'Khoai tây chiên'], m: [290, 3.4, 36, 15], p: [150] },
  { id: 'hummus', n: ['Hummus', 'Hummus', 'Sốt đậu gà (hummus)'], m: [260, 7, 14, 19], p: [50] },
  { id: 'pesto', n: ['Pesto Genovese', 'Pesto Genovese', 'Sốt Pesto'], m: [500, 5, 6, 50], p: [30] },
  { id: 'tomatensauce', n: ['Tomatensauce (passiert)', 'Tomato passata', 'Sốt cà chua'], m: [35, 1.5, 6, 0.3], p: [125] },
  { id: 'apfelschorle', n: ['Apfelschorle', 'Apple spritzer', 'Nước táo pha soda'], m: [25, 0, 6, 0], p: [330, '1 Glas', '1 glass', '1 ly'], region: 'de' },
  { id: 'cola', n: ['Cola', 'Cola', 'Nước ngọt cola'], m: [42, 0, 10.6, 0], p: [330, '1 Dose', '1 can', '1 lon'] },
  { id: 'bier', n: ['Bier (Pils)', 'Beer (lager)', 'Bia'], m: [42, 0.5, 3, 0], p: [500, '1 Flasche', '1 bottle', '1 chai'], pvi: [330, '1 lon'] },
  { id: 'hafermilch', n: ['Haferdrink', 'Oat drink', 'Sữa yến mạch'], m: [45, 0.5, 7, 1.5], p: [250, '1 Glas', '1 glass', '1 ly'] },

  // Vietnamesische Küche (region vi)
  { id: 'pho-bo', n: ['Phở bò (Reisnudelsuppe mit Rind)', 'Phở bò (beef noodle soup)', 'Phở bò'], m: [75, 5, 9, 1.5], p: [600, '1 Schüssel', '1 bowl', '1 tô'], region: 'vi', aka: ['phở', 'pho'] },
  { id: 'pho-ga', n: ['Phở gà (Reisnudelsuppe mit Huhn)', 'Phở gà (chicken noodle soup)', 'Phở gà'], m: [70, 5.5, 8.5, 1.3], p: [600, '1 Schüssel', '1 bowl', '1 tô'], region: 'vi' },
  { id: 'bun-bo-hue', n: ['Bún bò Huế (scharfe Rindernudelsuppe)', 'Bún bò Huế (spicy beef noodle soup)', 'Bún bò Huế'], m: [85, 5.5, 9, 3], p: [600, '1 Schüssel', '1 bowl', '1 tô'], region: 'vi' },
  { id: 'bun-cha', n: ['Bún chả (Reisnudeln mit gegrilltem Schwein)', 'Bún chả (noodles with grilled pork)', 'Bún chả'], m: [150, 8, 16, 6], p: [400, '1 Portion', '1 serving', '1 phần'], region: 'vi' },
  { id: 'bun-rieu', n: ['Bún riêu (Krabben-Tomaten-Nudelsuppe)', 'Bún riêu (crab tomato noodle soup)', 'Bún riêu'], m: [75, 4.5, 9, 2.5], p: [600, '1 Schüssel', '1 bowl', '1 tô'], region: 'vi' },
  { id: 'hu-tieu', n: ['Hủ tiếu Nam Vang (Nudelsuppe)', 'Hủ tiếu Nam Vang (noodle soup)', 'Hủ tiếu Nam Vang'], m: [80, 5, 10, 2], p: [600, '1 Schüssel', '1 bowl', '1 tô'], region: 'vi' },
  { id: 'mi-quang', n: ['Mì Quảng (Nudeln aus Quảng Nam)', 'Mì Quảng (turmeric noodles)', 'Mì Quảng'], m: [110, 6, 14, 3.5], p: [450, '1 Schüssel', '1 bowl', '1 tô'], region: 'vi' },
  { id: 'com-tam', n: ['Cơm tấm sườn (Bruchreis mit Kotelett)', 'Cơm tấm sườn (broken rice with pork chop)', 'Cơm tấm sườn'], m: [160, 8, 20, 5.5], p: [400, '1 Teller', '1 plate', '1 đĩa'], region: 'vi' },
  { id: 'com-chien', n: ['Cơm chiên (gebratener Reis)', 'Cơm chiên (fried rice)', 'Cơm chiên'], m: [170, 5, 25, 5.5], p: [350, '1 Teller', '1 plate', '1 đĩa'], region: 'vi' },
  { id: 'mi-xao-bo', n: ['Mì xào bò (gebratene Nudeln mit Rind)', 'Mì xào bò (stir-fried noodles with beef)', 'Mì xào bò'], m: [160, 8, 18, 6], p: [350, '1 Teller', '1 plate', '1 đĩa'], region: 'vi' },
  { id: 'banh-mi-thit', n: ['Bánh mì thịt (Baguette mit Fleisch)', 'Bánh mì thịt (pork baguette)', 'Bánh mì thịt'], m: [225, 9, 28, 8.5], p: [200, '1 Stück', '1 sandwich', '1 ổ'], region: 'vi' },
  { id: 'banh-mi-khong', n: ['Bánh mì (vietnamesisches Baguette, pur)', 'Bánh mì (plain Vietnamese baguette)', 'Bánh mì không'], m: [270, 9, 52, 3], p: [80, '1 Stück', '1 roll', '1 ổ'], region: 'vi' },
  { id: 'xoi', n: ['Xôi (Klebreis)', 'Xôi (sticky rice)', 'Xôi trắng'], m: [170, 3.5, 37, 0.3], p: [200, '1 Portion', '1 serving', '1 gói'], region: 'vi' },
  { id: 'xoi-ga', n: ['Xôi gà (Klebreis mit Huhn)', 'Xôi gà (sticky rice with chicken)', 'Xôi gà'], m: [190, 8, 30, 4], p: [250, '1 Portion', '1 serving', '1 gói'], region: 'vi' },
  { id: 'goi-cuon', n: ['Gỏi cuốn (Sommerrolle)', 'Gỏi cuốn (fresh spring roll)', 'Gỏi cuốn'], m: [120, 6, 17, 2.5], p: [75, '1 Rolle', '1 roll', '1 cuốn'], region: 'vi' },
  { id: 'cha-gio', n: ['Chả giò (frittierte Frühlingsrolle)', 'Chả giò (fried spring roll)', 'Chả giò'], m: [270, 9, 20, 17], p: [40, '1 Stück', '1 roll', '1 cái'], region: 'vi' },
  { id: 'banh-xeo', n: ['Bánh xèo (knuspriger Pfannkuchen)', 'Bánh xèo (crispy pancake)', 'Bánh xèo'], m: [220, 7, 22, 12], p: [200, '1 Stück', '1 pancake', '1 cái'], region: 'vi' },
  { id: 'banh-cuon', n: ['Bánh cuốn (gedämpfte Reisrollen)', 'Bánh cuốn (steamed rice rolls)', 'Bánh cuốn'], m: [130, 5, 21, 3], p: [250, '1 Teller', '1 plate', '1 đĩa'], region: 'vi' },
  { id: 'banh-bao', n: ['Bánh bao (gedämpftes Brötchen mit Fleisch)', 'Bánh bao (steamed pork bun)', 'Bánh bao nhân thịt'], m: [230, 8, 35, 6], p: [150, '1 Stück', '1 bun', '1 cái'], region: 'vi' },
  { id: 'banh-chung', n: ['Bánh chưng (Klebreiskuchen)', 'Bánh chưng (sticky rice cake)', 'Bánh chưng'], m: [180, 6, 28, 5], p: [200, '1 Stück', '1 piece', '1 miếng'], region: 'vi' },
  { id: 'chao-ga', n: ['Cháo gà (Reisbrei mit Huhn)', 'Cháo gà (chicken rice porridge)', 'Cháo gà'], m: [60, 4, 8, 1.2], p: [400, '1 Schüssel', '1 bowl', '1 bát'], region: 'vi' },
  { id: 'ca-kho-to', n: ['Cá kho tộ (geschmorter Fisch)', 'Cá kho tộ (caramelised braised fish)', 'Cá kho tộ'], m: [150, 17, 6, 6.5], p: [150, '1 Portion', '1 serving', '1 phần'], region: 'vi' },
  { id: 'thit-kho-trung', n: ['Thịt kho trứng (Schmorfleisch mit Ei)', 'Thịt kho trứng (braised pork with egg)', 'Thịt kho trứng'], m: [200, 14, 5, 14], p: [200, '1 Portion', '1 serving', '1 phần'], region: 'vi' },
  { id: 'bo-kho', n: ['Bò kho (Rindfleischeintopf)', 'Bò kho (beef stew)', 'Bò kho'], m: [120, 12, 5, 6], p: [300, '1 Schüssel', '1 bowl', '1 tô'], region: 'vi' },
  { id: 'canh-chua', n: ['Canh chua cá (saure Fischsuppe)', 'Canh chua cá (sour fish soup)', 'Canh chua cá'], m: [40, 4, 4, 1], p: [300, '1 Schüssel', '1 bowl', '1 bát'], region: 'vi' },
  { id: 'rau-muong-xao', n: ['Rau muống xào tỏi (Wasserspinat mit Knoblauch)', 'Rau muống xào tỏi (stir-fried water spinach)', 'Rau muống xào tỏi'], m: [65, 3, 4, 4.5], p: [150, '1 Teller', '1 plate', '1 đĩa'], region: 'vi' },
  { id: 'dau-hu-chien', n: ['Đậu hũ chiên (gebratener Tofu)', 'Đậu hũ chiên (fried tofu)', 'Đậu hũ chiên'], m: [270, 17, 9, 20], p: [100, '1 Portion', '1 serving', '1 phần'], region: 'vi' },
  { id: 'ga-luoc', n: ['Gà luộc (gekochtes Huhn)', 'Gà luộc (boiled chicken)', 'Gà luộc'], m: [200, 25, 0, 11], p: [150, '1 Portion', '1 serving', '1 phần'], region: 'vi' },
  { id: 'thit-luoc', n: ['Thịt ba chỉ luộc (gekochter Schweinebauch)', 'Thịt ba chỉ luộc (boiled pork belly)', 'Thịt ba chỉ luộc'], m: [260, 16, 0, 22], p: [100, '1 Portion', '1 serving', '1 phần'], region: 'vi' },
  { id: 'suon-nuong', n: ['Sườn nướng (gegrillte Rippchen)', 'Sườn nướng (grilled pork chop)', 'Sườn nướng'], m: [250, 20, 6, 16], p: [120, '1 Stück', '1 piece', '1 miếng'], region: 'vi' },
  { id: 'ca-basa', n: ['Pangasius / Basa (roh)', 'Basa fish (raw)', 'Cá basa (sống)'], m: [90, 15, 0, 3], p: [150, '1 Filet', '1 fillet', '1 miếng'], region: 'vi' },
  { id: 'muc-xao', n: ['Mực xào (gebratener Tintenfisch)', 'Mực xào (stir-fried squid)', 'Mực xào'], m: [110, 15, 4, 4], p: [150, '1 Teller', '1 plate', '1 đĩa'], region: 'vi' },
  { id: 'cha-lua', n: ['Chả lụa (vietnamesische Schweinewurst)', 'Chả lụa (Vietnamese pork roll)', 'Chả lụa'], m: [200, 15, 3, 14], p: [50, '1 Scheibe', '1 slice', '1 lát'], region: 'vi' },
  { id: 'lap-xuong', n: ['Lạp xưởng (süße Wurst)', 'Lạp xưởng (sweet sausage)', 'Lạp xưởng'], m: [500, 18, 15, 42], p: [30, '1 Stück', '1 link', '1 cây'], region: 'vi' },
  { id: 'trung-vit-lon', n: ['Trứng vịt lộn (Balut)', 'Trứng vịt lộn (balut)', 'Trứng vịt lộn'], m: [180, 13.6, 4, 12.4], p: [70, '1 Ei', '1 egg', '1 quả'], region: 'vi' },
  { id: 'ga-ran', n: ['Gà rán (frittiertes Huhn)', 'Gà rán (fried chicken)', 'Gà rán'], m: [260, 18, 9, 17], p: [100, '1 Stück', '1 piece', '1 miếng'], region: 'vi' },
  { id: 'mi-goi', n: ['Mì gói (Instantnudeln, trocken)', 'Mì gói (instant noodles, dry)', 'Mì gói (khô)'], m: [450, 9, 60, 19], p: [75, '1 Packung', '1 pack', '1 gói'], region: 'vi' },
  { id: 'bun-tuoi', n: ['Bún (Reisnudeln, gekocht)', 'Bún (rice vermicelli, cooked)', 'Bún tươi'], m: [110, 1.7, 25, 0.2], p: [200, '1 Portion', '1 serving', '1 phần'], region: 'vi' },
  { id: 'banh-pho', n: ['Bánh phở (Reisbandnudeln, gekocht)', 'Bánh phở (flat rice noodles, cooked)', 'Bánh phở'], m: [110, 1.8, 25, 0.2], p: [200, '1 Portion', '1 serving', '1 phần'], region: 'vi' },
  { id: 'nuoc-mam', n: ['Nước mắm (Fischsauce)', 'Nước mắm (fish sauce)', 'Nước mắm'], m: [35, 5, 3.6, 0], p: [15, '1 EL', '1 tbsp', '1 muỗng canh'], region: 'vi' },
  { id: 'rau-cai', n: ['Pak Choi / Senfkohl', 'Bok choy / mustard greens', 'Cải thìa / cải xanh'], m: [13, 1.5, 2.2, 0.2], p: [150], region: 'vi' },
  { id: 'gia-do', n: ['Mungobohnensprossen', 'Bean sprouts', 'Giá đỗ'], m: [30, 3, 6, 0.2], p: [50], region: 'vi' },
  { id: 'xoai', n: ['Mango', 'Mango', 'Xoài'], m: [60, 0.8, 15, 0.4], p: [200, '1 Mango', '1 mango', '1 quả'], region: 'vi' },
  { id: 'thanh-long', n: ['Drachenfrucht', 'Dragon fruit', 'Thanh long'], m: [50, 1.1, 11, 0.4], p: [300, '1 Frucht', '1 fruit', '1 quả'], region: 'vi' },
  { id: 'du-du', n: ['Papaya', 'Papaya', 'Đu đủ'], m: [43, 0.5, 11, 0.3], p: [200], region: 'vi' },
  { id: 'mit', n: ['Jackfrucht', 'Jackfruit', 'Mít'], m: [95, 1.7, 23, 0.6], p: [100], region: 'vi' },
  { id: 'vai', n: ['Litschi', 'Lychee', 'Vải'], m: [66, 0.8, 16.5, 0.4], p: [100], region: 'vi' },
  { id: 'nuoc-dua', n: ['Kokoswasser', 'Coconut water', 'Nước dừa'], m: [19, 0.7, 3.7, 0.2], p: [300, '1 Kokosnuss', '1 coconut', '1 trái'], region: 'vi' },
  { id: 'dau-phong', n: ['Erdnüsse (geröstet)', 'Peanuts (roasted)', 'Đậu phộng rang'], m: [585, 25, 16, 49], p: [30, '1 Handvoll', '1 handful', '1 nắm'], region: 'vi' },
  { id: 'sua-dau-nanh', n: ['Sojamilch', 'Soy milk', 'Sữa đậu nành'], m: [45, 3.3, 4, 1.8], p: [250, '1 Glas', '1 glass', '1 ly'], region: 'vi' },
  { id: 'sua-chua-vn', n: ['Vietnamesischer Joghurt (gesüßt)', 'Vietnamese yoghurt (sweetened)', 'Sữa chua (có đường)'], m: [100, 3.5, 15, 3], p: [100, '1 Becher', '1 pot', '1 hũ'], region: 'vi' },
  { id: 'ca-phe-sua-da', n: ['Cà phê sữa đá (Eiskaffee mit Kondensmilch)', 'Cà phê sữa đá (iced coffee with condensed milk)', 'Cà phê sữa đá'], m: [60, 1.2, 10, 1.6], p: [200, '1 Glas', '1 glass', '1 ly'], region: 'vi', aka: ['cà phê sữa', 'cafe sữa đá'] },
  { id: 'tra-sua', n: ['Trà sữa trân châu (Bubble Tea)', 'Trà sữa trân châu (bubble tea)', 'Trà sữa trân châu'], m: [70, 0.8, 13, 1.8], p: [500, '1 Becher', '1 cup', '1 ly'], region: 'vi' },
  { id: 'che-dau-xanh', n: ['Chè đậu xanh (süßes Mungobohnen-Dessert)', 'Chè đậu xanh (sweet mung bean dessert)', 'Chè đậu xanh'], m: [120, 3, 25, 1], p: [250, '1 Becher', '1 cup', '1 ly'], region: 'vi' },
  { id: 'sinh-to-bo', n: ['Sinh tố bơ (Avocado-Smoothie)', 'Sinh tố bơ (avocado smoothie)', 'Sinh tố bơ'], m: [110, 1.5, 13, 6], p: [350, '1 Glas', '1 glass', '1 ly'], region: 'vi' },
  { id: 'banh-flan', n: ['Bánh flan (Karamellpudding)', 'Bánh flan (crème caramel)', 'Bánh flan'], m: [150, 5, 22, 5], p: [100, '1 Stück', '1 pot', '1 cái'], region: 'vi' },
]

export const FOODS: Food[] = ROWS.map((r) => {
  const [de, en, vi] = r.n
  const [kcal, protein, carbs, fat] = r.m
  const labels = r.p && r.p[1] ? { de: r.p[1], en: r.p[2] ?? r.p[1], vi: r.p[3] ?? r.p[1] } : undefined
  return {
    id: r.id,
    name: de,
    names: { de, en, vi },
    per100: { kcal, protein, carbs, fat },
    portion: r.p?.[0],
    portionLabel: r.p?.[1],
    portionLabels: labels,
    viPortion: r.pvi ? { grams: r.pvi[0], label: r.pvi[1] } : undefined,
    region: r.region,
    aliases: r.aka,
  }
})

/** Name in the given language (custom and Open Food Facts foods keep their own name). */
export function foodName(f: Food, lang: Lang): string {
  return f.names?.[lang] ?? f.name
}

/** Typical portion for the language: grams plus a label like "1 quả" or "1 egg". */
export function foodPortion(f: Food, lang: Lang): { grams?: number; label?: string } {
  if (lang === 'vi' && f.viPortion) return { grams: f.viPortion.grams, label: f.viPortion.label }
  return { grams: f.portion, label: f.portionLabels?.[lang] ?? f.portionLabel }
}


/** The user's own foods first, then the built-in list. */
export function allFoods(s: { customFoods: Food[] }): Food[] {
  return [...s.customFoods, ...FOODS]
}
