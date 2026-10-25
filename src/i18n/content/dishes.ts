import type { DishId, Extra } from '../../domain/meals'
import { getLang, type Lang } from '../lang'

type Text = [name: string, steps: string[]]

/** Dish names and short methods in every language; a missing dish is a type error. */
export const DISH_TEXT: Record<DishId, Record<Lang, Text>> = {
  'pho-ga': {
    de: ['Phở gà (Reisnudelsuppe mit Huhn)', ['Brühe mit Ingwer, halbierter Zwiebel und Sternanis 20 min leise köcheln, Gewürze entfernen.', 'Hähnchen in dünnen Streifen 3 bis 4 min in der heißen Brühe garziehen.', 'Reisnudeln nach Packung kochen, abspülen und in Schalen verteilen.', 'Brühe darübergießen, mit Sprossen, Kräutern, Limette und Fischsauce abschmecken.']],
    en: ['Phở gà (rice noodle soup with chicken)', ['Simmer the broth with ginger, a halved onion and star anise for 20 min, then remove the spices.', 'Poach thin chicken strips in the hot broth for 3 to 4 min.', 'Cook the rice noodles as on the pack, rinse and divide into bowls.', 'Pour over the broth, finish with sprouts, herbs, lime and fish sauce.']],
    vi: ['Phở gà', ['Hầm nước dùng với gừng, nửa củ hành và hoa hồi khoảng 20 phút, vớt gia vị ra.', 'Thái ức gà mỏng, chần trong nước dùng nóng 3 đến 4 phút.', 'Luộc bánh phở theo hướng dẫn, xả nước lạnh rồi chia ra tô.', 'Chan nước dùng, thêm giá, rau thơm, chanh và nêm nước mắm.']],
  },
  'bun-bo-xao': {
    de: ['Bún bò xào (Reisnudelsalat mit Rind)', ['Rind in dünne Streifen schneiden, mit etwas Fischsauce und Zucker 15 min marinieren.', 'Dressing aus Fischsauce, Zucker, Limette, Wasser und Chili mischen.', 'Reisnudeln kochen und abspülen, Salat, Gurke und Karotte in Streifen schneiden.', 'Rind 2 bis 3 min scharf anbraten, alles schichten, Dressing und gehackte Erdnüsse darüber.']],
    en: ['Bún bò xào (rice noodle salad with beef)', ['Slice the beef thinly and marinate with a little fish sauce and sugar for 15 min.', 'Mix a dressing of fish sauce, sugar, lime, water and chili.', 'Cook and rinse the noodles; cut lettuce, cucumber and carrot into strips.', 'Sear the beef for 2 to 3 min, layer everything, top with dressing and chopped peanuts.']],
    vi: ['Bún bò xào', ['Thái bò mỏng, ướp với chút nước mắm và đường 15 phút.', 'Pha nước mắm chua ngọt: nước mắm, đường, chanh, nước lọc và ớt.', 'Luộc bún, xả lạnh; thái rau sống, dưa leo, cà rốt thành sợi.', 'Xào bò lửa lớn 2 đến 3 phút, xếp tất cả vào tô, rưới nước mắm và rắc đậu phộng.']],
  },
  'com-ga': {
    de: ['Cơm gà (Hühnchenreis)', ['Reis waschen und in viel Wasser (1:6) mit Ingwer kochen, Kochwasser abgießen.', 'Hähnchenschenkel mit Sojasauce und etwas Öl 6 bis 7 min je Seite braten.', 'Aufschneiden und mit Gurke, Tomate und Frühlingszwiebel auf dem Reis anrichten.']],
    en: ['Cơm gà (chicken rice)', ['Wash the rice and boil it in plenty of water (1:6) with ginger, then drain.', 'Fry the chicken thighs with soy sauce and a little oil for 6 to 7 min per side.', 'Slice and serve on the rice with cucumber, tomato and spring onion.']],
    vi: ['Cơm gà', ['Vo gạo, nấu với nhiều nước (1:6) và vài lát gừng rồi chắt bớt nước.', 'Áp chảo đùi gà với xì dầu và chút dầu, mỗi mặt 6 đến 7 phút.', 'Thái miếng, bày lên cơm cùng dưa leo, cà chua và hành lá.']],
  },
  'goi-cuon': {
    de: ['Gỏi cuốn (Sommerrollen mit Garnelen)', ['Garnelen 2 min kochen, Reisnudeln garen und abspülen.', 'Reispapier kurz einweichen, mit Garnelen, Salat, Karotte, Gurke und Nudeln füllen und einrollen.', 'Dip aus Fischsauce, Zucker, Limette und gehackten Erdnüssen dazu.']],
    en: ['Gỏi cuốn (summer rolls with prawns)', ['Boil the prawns for 2 min; cook and rinse the rice noodles.', 'Dip the rice paper briefly, fill with prawns, lettuce, carrot, cucumber and noodles, then roll.', 'Serve with a dip of fish sauce, sugar, lime and chopped peanuts.']],
    vi: ['Gỏi cuốn tôm', ['Luộc tôm 2 phút; luộc bún và xả lạnh.', 'Nhúng bánh tráng qua nước, cuốn tôm, rau sống, cà rốt, dưa leo và bún.', 'Chấm với nước mắm pha chanh đường và đậu phộng giã.']],
  },
  'banh-mi-trung': {
    de: ['Bánh mì trứng (Baguette mit Ei)', ['Eier als Spiegel- oder Rührei braten.', 'Baguette aufschneiden, mit Ei, Gurke, Karotte und Kräutern füllen.', 'Mit einem Spritzer Sojasauce und nach Wunsch Chili abschmecken.']],
    en: ['Bánh mì trứng (baguette with egg)', ['Fry the eggs sunny side up or scrambled.', 'Split the baguette and fill with egg, cucumber, carrot and herbs.', 'Season with a dash of soy sauce and chili if you like.']],
    vi: ['Bánh mì trứng', ['Chiên trứng ốp la hoặc trứng khuấy.', 'Xẻ bánh mì, kẹp trứng, dưa leo, cà rốt và rau thơm.', 'Rưới chút xì dầu, thêm ớt tùy thích.']],
  },
  bibimbap: {
    de: ['Bibimbap (Reisschale mit Rind, Gemüse und Ei)', ['Reis garen. Rind mit etwas Sojasauce krümelig braten.', 'Spinat 1 min blanchieren, Karotte kurz anbraten, Sprossen 2 min kochen.', 'Spiegelei braten.', 'Alles auf den Reis legen, Kimchi dazu, Gochujang mit etwas Öl verrühren und darübergeben.']],
    en: ['Bibimbap (rice bowl with beef, vegetables and egg)', ['Cook the rice. Fry the beef with a little soy sauce until crumbly.', 'Blanch the spinach for 1 min, stir-fry the carrot briefly, boil the sprouts for 2 min.', 'Fry an egg.', 'Arrange everything on the rice with kimchi; stir gochujang with a little oil and spoon over.']],
    vi: ['Bibimbap (cơm trộn Hàn Quốc)', ['Nấu cơm. Xào bò với chút xì dầu cho tơi.', 'Chần rau chân vịt 1 phút, xào sơ cà rốt, luộc giá 2 phút.', 'Chiên một quả trứng ốp la.', 'Xếp tất cả lên cơm cùng kim chi, trộn tương Gochujang với chút dầu rồi rưới lên.']],
  },
  'bulgogi-bowl': {
    de: ['Bulgogi-Bowl (mariniertes Rind mit Reis)', ['Rind in dünne Streifen schneiden und 20 min in Sojasauce, Zucker und etwas Öl marinieren.', 'Mit Zwiebel und Paprika in einer heißen Pfanne 4 bis 5 min braten.', 'Auf Reis mit Kimchi und Sesam servieren.']],
    en: ['Bulgogi bowl (marinated beef with rice)', ['Slice the beef thinly and marinate in soy sauce, sugar and a little oil for 20 min.', 'Fry with onion and bell pepper in a hot pan for 4 to 5 min.', 'Serve on rice with kimchi and sesame.']],
    vi: ['Cơm bò Bulgogi', ['Thái bò mỏng, ướp xì dầu, đường và chút dầu trong 20 phút.', 'Xào cùng hành tây và ớt chuông trên chảo nóng 4 đến 5 phút.', 'Ăn với cơm, kim chi và rắc mè.']],
  },
  'pad-kra-pao': {
    de: ['Pad Kra Pao (Thai-Basilikum-Hähnchen)', ['Reis garen. Hähnchen fein hacken, Sauce aus Soja- und Austernsauce, Zucker und Wasser mischen.', 'Knoblauch und Chili 20 s in heißem Öl anbraten, Hähnchen 3 bis 4 min braten, Bohnen und Paprika zugeben.', 'Sauce zugeben, kurz einkochen, Basilikum unterheben. Mit Spiegelei auf Reis servieren.']],
    en: ['Pad kra pao (Thai basil chicken)', ['Cook the rice. Mince the chicken; mix soy sauce, oyster sauce, sugar and water.', 'Fry garlic and chili in hot oil for 20 s, add the chicken for 3 to 4 min, then beans and pepper.', 'Add the sauce, reduce briefly, fold in basil. Serve on rice with a fried egg.']],
    vi: ['Gà xào lá húng quế kiểu Thái', ['Nấu cơm. Băm nhỏ ức gà; pha xì dầu, dầu hào, đường và chút nước.', 'Phi tỏi ớt 20 giây, xào gà 3 đến 4 phút, cho đậu que và ớt chuông vào.', 'Đổ nước sốt, đảo cho sánh, thêm húng quế. Ăn với cơm và trứng ốp la.']],
  },
  'lachs-teriyaki': {
    de: ['Lachs-Teriyaki-Donburi', ['Reis garen. Sojasauce, Mirin und Zucker 2 min zu einer Teriyaki-Sauce einkochen.', 'Lachs auf der Hautseite 4 min braten, wenden, 2 min weiterbraten und mit der Sauce glasieren.', 'Brokkoli und Edamame 3 bis 4 min dämpfen, alles auf dem Reis anrichten und mit Sesam bestreuen.']],
    en: ['Salmon teriyaki donburi', ['Cook the rice. Reduce soy sauce, mirin and sugar for 2 min into a teriyaki sauce.', 'Fry the salmon skin side down for 4 min, turn, cook 2 min more and glaze with the sauce.', 'Steam broccoli and edamame for 3 to 4 min, arrange on the rice and sprinkle with sesame.']],
    vi: ['Cơm cá hồi sốt Teriyaki', ['Nấu cơm. Đun xì dầu, mirin và đường 2 phút thành sốt Teriyaki.', 'Áp chảo cá hồi mặt da 4 phút, lật lại 2 phút rồi rưới sốt cho bóng.', 'Hấp bông cải xanh và đậu nành Nhật 3 đến 4 phút, bày lên cơm, rắc mè.']],
  },
  'mapo-tofu': {
    de: ['Mapo Tofu (leicht)', ['Reis garen. Tofu würfeln und 5 min in heißem Salzwasser ziehen lassen.', 'Rinderhack in wenig Öl krümelig braten, Doubanjiang und Zwiebel 1 min mitbraten.', 'Brühe, Tofu und Pak Choi 4 min köcheln, mit angerührter Stärke binden und auf Reis servieren.']],
    en: ['Mapo tofu (light)', ['Cook the rice. Cube the tofu and let it sit in hot salted water for 5 min.', 'Fry the mince in a little oil until crumbly, add doubanjiang and onion for 1 min.', 'Simmer broth, tofu and pak choi for 4 min, thicken with starch slurry and serve on rice.']],
    vi: ['Đậu hũ Tứ Xuyên (Mapo, ít dầu)', ['Nấu cơm. Cắt đậu hũ hạt lựu, ngâm nước muối nóng 5 phút.', 'Xào thịt bò xay với ít dầu cho tơi, cho tương đậu ớt và hành vào xào 1 phút.', 'Thêm nước dùng, đậu hũ và cải thìa, nấu 4 phút, sệt lại bằng bột năng, ăn với cơm.']],
  },
  congee: {
    de: ['Congee (Reisbrei mit Huhn und Ei)', ['Reis waschen und mit viel Wasser (ca. 700 ml pro Portion) und Ingwer 45 bis 60 min köcheln.', 'Hähnchen in dünnen Scheiben 5 min im Brei garziehen, Pak Choi in den letzten 2 min zugeben.', 'Mit weichem Ei, Frühlingszwiebel und Sojasauce servieren. Höchstens einmal pro Woche (Arsen bleibt im Kochwasser).']],
    en: ['Congee (rice porridge with chicken and egg)', ['Wash the rice and simmer with plenty of water (about 700 ml per portion) and ginger for 45 to 60 min.', 'Poach thin chicken slices in the porridge for 5 min, add pak choi for the last 2 min.', 'Serve with a soft egg, spring onion and soy sauce. At most once a week (arsenic stays in the cooking water).']],
    vi: ['Cháo gà trứng', ['Vo gạo, nấu với nhiều nước (khoảng 700 ml mỗi phần) và gừng trong 45 đến 60 phút.', 'Cho gà thái mỏng vào cháo 5 phút, thêm cải thìa 2 phút cuối.', 'Ăn với trứng lòng đào, hành lá và xì dầu. Tối đa một lần mỗi tuần (asen còn trong nước nấu).']],
  },
  'tomaten-ruehrei': {
    de: ['Tomaten-Rührei mit Reis', ['Reis garen. Eier verquirlen, mit einer Prise Salz in heißem Öl locker stocken lassen, herausnehmen.', 'Tomaten mit Zwiebel 4 bis 5 min im restlichen Öl weich schmoren, etwas Zucker zugeben.', 'Rührei zurückgeben, kurz mischen und mit Edamame auf Reis servieren.']],
    en: ['Tomato and egg stir-fry with rice', ['Cook the rice. Whisk the eggs with a pinch of salt, scramble softly in hot oil and set aside.', 'Stew tomatoes and onion in the remaining oil for 4 to 5 min, add a little sugar.', 'Return the egg, mix briefly and serve on rice with edamame.']],
    vi: ['Trứng xào cà chua', ['Nấu cơm. Đánh trứng với chút muối, xào sơ trong dầu nóng rồi để riêng.', 'Xào cà chua với hành 4 đến 5 phút cho mềm, thêm chút đường.', 'Cho trứng vào đảo đều, ăn với cơm và đậu nành Nhật.']],
  },
  'overnight-oats': {
    de: ['Overnight Oats', ['Haferflocken, Milch und Skyr verrühren, Honig zugeben.', 'Abgedeckt über Nacht in den Kühlschrank stellen.', 'Morgens mit Banane und Erdnussbutter toppen.']],
    en: ['Overnight oats', ['Stir oats, milk and skyr together, add honey.', 'Cover and leave in the fridge overnight.', 'Top with banana and peanut butter in the morning.']],
    vi: ['Yến mạch ngâm qua đêm', ['Trộn yến mạch, sữa và skyr, thêm mật ong.', 'Đậy kín, để tủ lạnh qua đêm.', 'Sáng ra thêm chuối và bơ đậu phộng.']],
  },
  'ruehrei-brot': {
    de: ['Rührei auf Vollkornbrot', ['Eier verquirlen und in wenig Öl bei mittlerer Hitze cremig stocken lassen.', 'Auf Vollkornbrot mit Tomatenscheiben anrichten.', 'Dazu ein Glas Orangensaft.']],
    en: ['Scrambled eggs on wholegrain bread', ['Whisk the eggs and cook gently in a little oil until creamy.', 'Serve on wholegrain bread with tomato slices.', 'Add a glass of orange juice.']],
    vi: ['Trứng khuấy với bánh mì nguyên cám', ['Đánh trứng, khuấy nhẹ trong ít dầu ở lửa vừa cho mềm.', 'Ăn với bánh mì nguyên cám và cà chua thái lát.', 'Uống kèm một ly nước cam.']],
  },
  'skyr-bowl': {
    de: ['Skyr-Bowl mit Beeren', ['Skyr in eine Schale geben.', 'Haferflocken und Beeren darüber, mit Honig süßen.']],
    en: ['Skyr bowl with berries', ['Spoon the skyr into a bowl.', 'Top with oats and berries, sweeten with honey.']],
    vi: ['Skyr với quả mọng', ['Cho skyr ra bát.', 'Thêm yến mạch và quả mọng, rưới mật ong.']],
  },
  onigiri: {
    de: ['Onigiri mit Thunfisch', ['Reis kochen, leicht salzen und etwas abkühlen lassen.', 'Thunfisch mit etwas Sojasauce mischen.', 'Mit feuchten Händen zwei Dreiecke mit Thunfischfüllung formen und in Nori wickeln.']],
    en: ['Onigiri with tuna', ['Cook the rice, salt lightly and let it cool a little.', 'Mix the tuna with a little soy sauce.', 'With damp hands shape two triangles around the filling and wrap in nori.']],
    vi: ['Cơm nắm cá ngừ (Onigiri)', ['Nấu cơm, nêm chút muối, để nguội bớt.', 'Trộn cá ngừ với chút xì dầu.', 'Làm ướt tay, nắm hai miếng cơm tam giác có nhân cá ngừ, quấn rong biển.']],
  },
  'protein-pudding': {
    de: ['Proteinpudding', ['Quark, Proteinpulver, Kakao und Honig glatt rühren.', 'Eine Stunde kalt stellen.']],
    en: ['Protein pudding', ['Stir quark, protein powder, cocoa and honey until smooth.', 'Chill for an hour.']],
    vi: ['Pudding protein', ['Khuấy đều quark, bột protein, ca cao và mật ong.', 'Để lạnh một tiếng.']],
  },
  'edamame-snack': {
    de: ['Edamame', ['TK-Edamame kurz kochen oder auftauen lassen.', 'Mit einer Prise Salz essen.']],
    en: ['Edamame', ['Boil frozen edamame briefly or let them thaw.', 'Eat with a pinch of salt.']],
    vi: ['Đậu nành Nhật (Edamame)', ['Luộc sơ hoặc rã đông đậu nành Nhật.', 'Rắc chút muối và ăn.']],
  },
  'brot-erdnuss-banane': {
    de: ['Vollkornbrot mit Erdnussbutter und Banane', ['Brot mit Erdnussbutter bestreichen.', 'Banane in Scheiben darauflegen.']],
    en: ['Wholegrain bread with peanut butter and banana', ['Spread the bread with peanut butter.', 'Top with banana slices.']],
    vi: ['Bánh mì nguyên cám với bơ đậu phộng và chuối', ['Phết bơ đậu phộng lên bánh mì.', 'Xếp chuối thái lát lên trên.']],
  },
  'eier-banane': {
    de: ['Gekochte Eier und Banane', ['Eier 9 bis 10 min hart kochen, abschrecken und schälen.', 'Mit einer Banane essen, gut zum Mitnehmen.']],
    en: ['Boiled eggs and a banana', ['Hard-boil the eggs for 9 to 10 min, cool and peel.', 'Eat with a banana; easy to take along.']],
    vi: ['Trứng luộc và chuối', ['Luộc trứng chín 9 đến 10 phút, ngâm nước lạnh rồi bóc vỏ.', 'Ăn kèm một quả chuối, tiện mang theo.']],
  },
  'whey-shake': {
    de: ['Whey-Shake mit Milch', ['Proteinpulver und Milch im Shaker 20 s schütteln. Bei Laktoseintoleranz Whey-Isolat und laktosefreie Milch nehmen.']],
    en: ['Whey shake with milk', ['Shake protein powder and milk in a shaker for 20 s. If lactose intolerant use whey isolate and lactose-free milk.']],
    vi: ['Sữa lắc whey', ['Cho bột whey và sữa vào bình lắc 20 giây. Nếu không dung nạp lactose, dùng whey isolate và sữa không lactose.']],
  },
  'soja-protein-shake': {
    de: ['Soja-Proteinshake', ['Sojaprotein, Sojadrink und Banane fein mixen.']],
    en: ['Soy protein shake', ['Blend soy protein, soy drink and banana until smooth.']],
    vi: ['Sữa lắc đạm đậu nành', ['Xay nhuyễn bột đạm đậu nành, sữa đậu nành và chuối.']],
  },
  'soja-shake': {
    de: ['Soja-Bananen-Shake', ['Sojadrink, Banane und Haferflocken fein mixen.']],
    en: ['Soy banana shake', ['Blend soy drink, banana and oats until smooth.']],
    vi: ['Sinh tố chuối sữa đậu nành', ['Xay nhuyễn sữa đậu nành, chuối và yến mạch.']],
  },
  'gochujang-tofu-bowl': {
    de: ['Gochujang-Tofu-Reisbowl', ['Tofu würfeln, in Stärke wenden und in Öl rundum knusprig braten.', 'Glasur aus Gochujang, Sojasauce, Ahornsirup, Reisessig, Knoblauch und Ingwer verrühren, Tofu darin schwenken.', 'Mit Reis, Edamame, Gurke, Karotte und Spinat anrichten, Sesam darüber.']],
    en: ['Gochujang tofu rice bowl', ['Cube the tofu, toss in starch and fry in oil until crisp.', 'Stir gochujang, soy sauce, maple syrup, rice vinegar, garlic and ginger into a glaze and toss the tofu in it.', 'Serve with rice, edamame, cucumber, carrot and spinach, sprinkle with sesame.']],
    vi: ['Cơm đậu hũ sốt Gochujang', ['Cắt đậu hũ, lăn qua bột năng, chiên giòn các mặt.', 'Pha sốt Gochujang với xì dầu, siro lá phong, giấm gạo, tỏi và gừng, đảo đậu hũ trong sốt.', 'Bày cùng cơm, đậu nành Nhật, dưa leo, cà rốt và rau chân vịt, rắc mè.']],
  },
  'tofu-erdnuss-nudeln': {
    de: ['Tofu-Brokkoli-Nudeln mit Erdnusssauce', ['Tofu würfeln, in Stärke wenden und knusprig braten.', 'Reisnudeln kochen, Brokkoli und Paprika 3 min mitgaren oder kurz braten.', 'Erdnussbutter, Sojasauce, Reisessig, Ahornsirup, Gochujang, Knoblauch und Ingwer mit warmem Wasser glatt rühren und alles vermengen.']],
    en: ['Tofu and broccoli noodles with peanut sauce', ['Cube the tofu, toss in starch and fry until crisp.', 'Cook the rice noodles; cook broccoli and pepper for 3 min with them or stir-fry briefly.', 'Whisk peanut butter, soy sauce, rice vinegar, maple, gochujang, garlic and ginger with warm water and toss everything together.']],
    vi: ['Bún xào đậu hũ bông cải sốt đậu phộng', ['Cắt đậu hũ, lăn bột năng, chiên giòn.', 'Luộc bún gạo; trụng bông cải và ớt chuông 3 phút hoặc xào nhanh.', 'Khuấy bơ đậu phộng, xì dầu, giấm gạo, siro, Gochujang, tỏi, gừng với nước ấm rồi trộn đều tất cả.']],
  },
  'kokos-curry': {
    de: ['Kokos-Kurkuma-Curry mit Tofu', ['Zwiebel, Knoblauch, Ingwer und Chili in Öl anschwitzen, Kurkuma kurz mitrösten.', 'Kokosmilch und Brühe zugeben, Blumenkohl 8 min köcheln, Tofu und Pilze 5 min mitgaren.', 'Vom Herd nehmen, Miso einrühren, mit Zitrone und Koriander abschmecken. Mit Reis servieren.']],
    en: ['Coconut turmeric tofu curry', ['Sweat onion, garlic, ginger and chili in oil, toast the turmeric briefly.', 'Add coconut milk and broth, simmer the cauliflower for 8 min, then tofu and mushrooms for 5 min.', 'Off the heat stir in the miso, finish with lemon and coriander. Serve with rice.']],
    vi: ['Cà ri nghệ nước cốt dừa với đậu hũ', ['Phi hành, tỏi, gừng và ớt với dầu, cho nghệ vào rang sơ.', 'Thêm nước cốt dừa và nước dùng, nấu súp lơ 8 phút, cho đậu hũ và nấm vào thêm 5 phút.', 'Tắt bếp, hòa miso vào, nêm chanh và rau mùi. Ăn với cơm.']],
  },
  'kichererbsen-bowl': {
    de: ['Kichererbsen-Avocado-Bowl', ['Kichererbsen abspülen und mit Avocado, Zitrone, Knoblauch und Olivenöl grob zerdrücken.', 'Gurke, Tomaten und Salat dazugeben, mit Hanfsamen bestreuen.', 'Mit Vollkornbrot essen. Fertig in 5 Minuten, ohne Herd.']],
    en: ['Smashed chickpea and avocado bowl', ['Rinse the chickpeas and roughly mash with avocado, lemon, garlic and olive oil.', 'Add cucumber, tomatoes and leaves, sprinkle with hemp hearts.', 'Eat with wholegrain bread. Ready in 5 minutes, no cooking.']],
    vi: ['Bát đậu gà nghiền với bơ', ['Rửa đậu gà, nghiền sơ với bơ, chanh, tỏi và dầu ô liu.', 'Thêm dưa leo, cà chua và rau xanh, rắc hạt gai dầu.', 'Ăn với bánh mì nguyên cám. Xong trong 5 phút, không cần nấu.']],
  },
  'chia-pudding': {
    de: ['Kakao-Walnuss-Chiapudding', ['Chia, Leinsamen, Kokosmilch, Kakao und Ahornsirup verrühren.', 'Über Nacht quellen lassen.', 'Mit Walnüssen und Beeren toppen.']],
    en: ['Cocoa walnut chia pudding', ['Stir chia, flaxseed, coconut milk, cocoa and maple syrup together.', 'Let it set overnight.', 'Top with walnuts and berries.']],
    vi: ['Pudding hạt chia ca cao óc chó', ['Trộn hạt chia, hạt lanh, nước cốt dừa, ca cao và siro.', 'Để qua đêm cho nở.', 'Thêm óc chó và quả mọng.']],
  },
  'matcha-oats': {
    de: ['Matcha-Overnight-Oats', ['Haferflocken, Chia, Leinsamen, Matcha und Sojadrink verrühren (Sojadrink statt Kokosmilch bringt mehr Eiweiß).', 'Über Nacht in den Kühlschrank stellen.', 'Mit Beeren, Walnüssen und Hanfsamen toppen.']],
    en: ['Matcha overnight oats', ['Stir oats, chia, flaxseed, matcha and soy drink (soy instead of coconut milk adds protein).', 'Leave in the fridge overnight.', 'Top with berries, walnuts and hemp hearts.']],
    vi: ['Yến mạch matcha ngâm qua đêm', ['Trộn yến mạch, hạt chia, hạt lanh, matcha và sữa đậu nành (thay nước cốt dừa để nhiều đạm hơn).', 'Để tủ lạnh qua đêm.', 'Thêm quả mọng, óc chó và hạt gai dầu.']],
  },
  'tofu-pfanne': {
    de: ['Gochujang-Tofu-Pfanne (15 Minuten)', ['Tofu in Öl rundum anbraten.', 'Brokkoli, Paprika und Pilze mit Knoblauch und Ingwer 4 bis 5 min mitbraten.', 'Sauce aus Gochujang, Sojasauce, Ahornsirup und Essig zugeben, kurz schwenken und mit Reis servieren.']],
    en: ['Gochujang tofu stir-fry (15 minutes)', ['Fry the tofu in oil until golden.', 'Add broccoli, pepper and mushrooms with garlic and ginger for 4 to 5 min.', 'Add a sauce of gochujang, soy sauce, maple and vinegar, toss and serve with rice.']],
    vi: ['Đậu hũ xào Gochujang (15 phút)', ['Chiên vàng đậu hũ với dầu.', 'Cho bông cải, ớt chuông, nấm cùng tỏi gừng vào xào 4 đến 5 phút.', 'Thêm sốt Gochujang, xì dầu, siro và giấm, đảo đều, ăn với cơm.']],
  },
  'bohnen-blech': {
    de: ['Brokkoli-Bohnen-Blech', ['Ofen auf 220 °C vorheizen. Brokkoli, Blumenkohl, Tomaten und Zwiebel mit Öl, Knoblauch, Paprikapulver und Thymian mischen.', '25 min rösten, in den letzten 10 min die Bohnen zugeben.', 'Mit Zitrone, Kräutern und Hanfsamen servieren.']],
    en: ['Broccoli and white bean traybake', ['Heat the oven to 220 °C. Toss broccoli, cauliflower, tomatoes and onion with oil, garlic, smoked paprika and thyme.', 'Roast for 25 min, adding the beans for the last 10 min.', 'Finish with lemon, herbs and hemp hearts.']],
    vi: ['Bông cải và đậu trắng nướng khay', ['Làm nóng lò 220 °C. Trộn bông cải xanh, súp lơ, cà chua, hành với dầu, tỏi, ớt bột và cỏ xạ hương.', 'Nướng 25 phút, cho đậu trắng vào 10 phút cuối.', 'Rưới chanh, rắc rau thơm và hạt gai dầu.']],
  },
  'linsen-paprika': {
    de: ['Gefüllte Paprika mit Linsen und Pilzen', ['Linsen 20 min kochen. Ofen auf 200 °C vorheizen, Paprika halbieren.', 'Zwiebel, Knoblauch und Pilze anbraten, mit Linsen, Spinat, Paprikapulver und Kräutern mischen (mehr Linsen als im Original, für mehr Eiweiß).', 'Paprika füllen und 25 min backen, mit Sojajoghurt und Zitrone servieren.']],
    en: ['Stuffed peppers with lentils and mushrooms', ['Cook the lentils for 20 min. Heat the oven to 200 °C and halve the peppers.', 'Fry onion, garlic and mushrooms, mix with lentils, spinach, smoked paprika and herbs (more lentils than the original, for protein).', 'Fill the peppers and bake for 25 min, serve with soy yogurt and lemon.']],
    vi: ['Ớt chuông nhồi đậu lăng và nấm', ['Luộc đậu lăng 20 phút. Làm nóng lò 200 °C, bổ đôi ớt chuông.', 'Xào hành, tỏi và nấm, trộn với đậu lăng, rau chân vịt, ớt bột và rau thơm (nhiều đậu lăng hơn bản gốc để thêm đạm).', 'Nhồi vào ớt, nướng 25 phút, ăn với sữa chua đậu nành và chanh.']],
  },
  'gruener-smoothie': {
    de: ['Grüner Smoothie', ['Banane, Spinat, Beeren, Leinsamen, Hanfsamen, Erdnussbutter und Sojadrink fein mixen.', 'Nach Wunsch einen Teelöffel Matcha dazu.']],
    en: ['Green smoothie', ['Blend banana, spinach, berries, flaxseed, hemp hearts, peanut butter and soy drink until smooth.', 'Add a teaspoon of matcha if you like.']],
    vi: ['Sinh tố xanh', ['Xay nhuyễn chuối, rau chân vịt, quả mọng, hạt lanh, hạt gai dầu, bơ đậu phộng và sữa đậu nành.', 'Thêm một muỗng matcha nếu thích.']],
  },
  'sesam-nudeln': {
    de: ['Kalte Sesam-Erdnuss-Reisnudeln', ['Reisnudeln kochen und kalt abspülen.', 'Gurke, Paprika und Karotte in Streifen schneiden, Edamame kurz blanchieren.', 'Erdnussbutter, Sojasauce, Reisessig, Ahornsirup, Gochujang, Knoblauch und Ingwer mit warmem Wasser verrühren, alles mischen, Sesam darüber.']],
    en: ['Cold sesame peanut rice noodles', ['Cook the rice noodles and rinse cold.', 'Cut cucumber, pepper and carrot into strips, blanch the edamame briefly.', 'Whisk peanut butter, soy sauce, rice vinegar, maple, gochujang, garlic and ginger with warm water, toss everything, top with sesame.']],
    vi: ['Bún trộn mè đậu phộng', ['Luộc bún gạo, xả nước lạnh.', 'Thái dưa leo, ớt chuông, cà rốt thành sợi; chần sơ đậu nành Nhật.', 'Khuấy bơ đậu phộng, xì dầu, giấm gạo, siro, Gochujang, tỏi, gừng với nước ấm, trộn đều, rắc mè.']],
  },
  'tofu-salat': {
    de: ['Bunter Tofu-Crunch-Salat (ohne Kochen)', ['Edamame in kaltem Wasser 5 min auftauen.', 'Tofu würfeln, Paprika, Gurke, Karotte und Zwiebel schneiden, mit Salat mischen.', 'Dressing aus Erdnussbutter, Sojasauce, Reisessig, Ahornsirup, Gochujang, Ingwer und Knoblauch mit Wasser glatt rühren, darüber, Sesam drauf.']],
    en: ['Rainbow tofu crunch salad (no cooking)', ['Thaw the edamame in cold water for 5 min.', 'Cube the tofu; cut pepper, cucumber, carrot and onion and mix with the leaves.', 'Whisk peanut butter, soy sauce, rice vinegar, maple, gochujang, ginger and garlic with water, pour over and add sesame.']],
    vi: ['Salad đậu hũ giòn nhiều màu (không nấu)', ['Ngâm đậu nành Nhật trong nước lạnh 5 phút cho rã đông.', 'Cắt đậu hũ; thái ớt chuông, dưa leo, cà rốt, hành và trộn với rau xanh.', 'Khuấy bơ đậu phộng, xì dầu, giấm gạo, siro, Gochujang, gừng, tỏi với nước, rưới lên, rắc mè.']],
  },
}

export const EXTRA_TEXT: Record<Extra, Record<Lang, string>> = {
  knoblauch: { de: 'Knoblauch', en: 'Garlic', vi: 'Tỏi' },
  ingwer: { de: 'Ingwer', en: 'Ginger', vi: 'Gừng' },
  limette: { de: 'Limetten', en: 'Limes', vi: 'Chanh' },
  zitrone: { de: 'Zitronen', en: 'Lemons', vi: 'Chanh vàng' },
  chili: { de: 'Chili', en: 'Chili', vi: 'Ớt' },
  kraeuter: { de: 'Frische Kräuter', en: 'Fresh herbs', vi: 'Rau thơm' },
  koriander: { de: 'Koriander', en: 'Coriander', vi: 'Rau mùi' },
  basilikum: { de: 'Thai-Basilikum', en: 'Thai basil', vi: 'Húng quế' },
  sternanis: { de: 'Sternanis', en: 'Star anise', vi: 'Hoa hồi' },
  kurkuma: { de: 'Kurkuma', en: 'Turmeric', vi: 'Bột nghệ' },
  nori: { de: 'Nori-Blätter', en: 'Nori sheets', vi: 'Rong biển nori' },
  matcha: { de: 'Matcha', en: 'Matcha', vi: 'Bột matcha' },
  reisessig: { de: 'Reisessig', en: 'Rice vinegar', vi: 'Giấm gạo' },
  paprikapulver: { de: 'Paprikapulver (geräuchert)', en: 'Smoked paprika', vi: 'Ớt bột xông khói' },
  reispapier: { de: 'Reispapier', en: 'Rice paper', vi: 'Bánh tráng' },
}

export const dishName = (id: string, lang: Lang = getLang()): string => DISH_TEXT[id as DishId]?.[lang][0] ?? id
export const dishSteps = (id: string, lang: Lang = getLang()): string[] => DISH_TEXT[id as DishId]?.[lang][1] ?? []
export const extraName = (e: Extra, lang: Lang = getLang()): string => EXTRA_TEXT[e][lang]
