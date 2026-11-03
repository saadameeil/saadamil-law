<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$LAWYER_PIN = '188572';
$LAWYER_PASS = 'SaadLawyer@2026';

$dataDir = __DIR__ . '/../data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
    file_put_contents($dataDir . '/.htaccess', "Order Deny,Allow\nDeny from all\n");
}

$articlesFile = $dataDir . '/articles.json';

// Initial Seed Articles if file doesn't exist
if (!file_exists($articlesFile)) {
    $seed = [
        [
            'id' => 'art-1',
            'title' => 'الدليل الإجرائي لدعوى إزالة الشيوع وفرز الحصص العقارية في المحاكم العراقية',
            'category' => 'العقارات والتركات',
            'date' => date('Y-m-d'),
            'excerpt' => 'خطوات إقامة دعوى إزالة الشيوع أمام محكمة البداءة، وكيفية حماية حصة الشريك أو الوريث من البيع ببخس الثمن بالمزاد العلني.',
            'content' => "دعوى إزالة الشيوع في القانون المدني العراقي رقم 40 لسنة 1951 تُعد من أهم الدعاوى العقارية لحسم النزاعات بين الشركاء والورثة.\n\nتُقام الدعوى أمام محكمة البداءة المختصة موقعياً بمحل العقار. يتم ندب خبير قضائي لتقدير إمكانية القسمة العينية؛ فإذا تعذرت القسمة، تصدر المحكمة قراراً ببيع العقار بالمزاد العلني وتوزيع بدلات البيع على الشركاء كلٌّ بحسب حصته الشرعية أو التعاقدية.\n\nينصح المحامي سعد فراس أميل دائماً بوضع إشارة عدم التصرف في دائرة التسجيل العقاري فور قيد الدعوى لمنع تهريب الحصص أو التلاعب بالملكية.",
            'author' => 'المحامي سعد فراس أميل',
            'views' => 142
        ],
        [
            'id' => 'art-2',
            'title' => 'درع الحماية القانونية لعقارات المغتربين العراقيين في أمريكا وأوروبا',
            'category' => 'شؤون المغتربين',
            'date' => date('Y-m-d', strtotime('-2 days')),
            'excerpt' => 'الإجراءات الأصولية لتصديق الوكالات القنصلية وحسم صحة الصدور وحماية أراضي وعقارات المهاجرين من تزوير مكاتب الدلالية.',
            'content' => "يواجه العراقيون المقيمون في الولايات المتحدة، كندا، بريطانيا، والدول الأوروبية تحديات جسيمة في إدارة أملاكهم ومتابعة تركاتهم في بغداد والمحافظات.\n\nالخطوة الأولى تبدأ من صياغة وكالة عامة أو خاصة لدى القنصلية العراقية في بلد الإقامة، تليها مطابقة صحة الصدور الإلكترونية عبر وزارة الخارجية في بغداد.\n\nيوفر مكتبنا تمثيلاً قضائياً رفيع المستوى بإشراف شخصي وتقارير مصورة موثقة لجميع مراحل الدعوى دون حاجة المغترب للسفر، مع إمكانية سداد أتعاب الاستشارة لحساب بنكي أمريكي رسمي (Zelle / ACH).",
            'author' => 'المحامي سعد فراس أميل',
            'views' => 289
        ],
        [
            'id' => 'art-3',
            'title' => 'إثبات الأدلة الرقمية وسلسلة الحيازة في قضايا الابتزاز الإلكتروني',
            'category' => 'الجرائم المعلوماتية',
            'date' => date('Y-m-d', strtotime('-5 days')),
            'excerpt' => 'كيفية توثيق بصمة التشفير الجنائية (SHA-256) للتسجيلات الصوتية ومحادثات الابتزاز لقبولها كدليل قطعي أمام قاضي التحقيق.',
            'content' => "مع تطور أدوات التزييف العميق واستنساخ الأصوات بالذكاء الاصطناعي، باتت المحاكم الجنائية ومحاكم التحقيق في العراق تتطلب تدقيقاً علمياً صارماً للأدلة الرقمية.\n\nوفقاً لقانون أصول المحاكمات الجزائية رقم 23 لسنة 1971 وقانون الإثبات العراقي رقم 107 لسنة 1979 المعدل، لا يُقبل الدليل الإلكتروني إلا إذا حوفظ على سلسلة حيازته (Chain of Custody) من لحظة استخراجه.\n\nيوفر مكتبنا بالتعاون مع خبرتنا في Gold Stone Intelligence فحصاً جنائياً محلياً للتسجيلات واستخراج بصمات التجزئة المشفرة لقطع الطريق على الخصم في ادعاء الفبركة.",
            'author' => 'المحامي سعد فراس أميل',
            'views' => 315
        ]
    ];
    file_put_contents($articlesFile, json_encode($seed, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

$articles = json_decode(file_get_contents($articlesFile), true) ?: [];

// Public GET: List all articles
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode(['status' => 'success', 'articles' => $articles], JSON_UNESCAPED_UNICODE);
    exit();
}

// POST: Admin Actions (Require Auth)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?: $_POST;

    // Check Auth
    $pin = $input['pin'] ?? $_GET['pin'] ?? '';
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $m)) $pin = trim($m[1]);

    if ($pin !== $LAWYER_PIN && $pin !== $LAWYER_PASS) {
        http_response_code(401);
        echo json_encode(['status' => 'unauthorized', 'message' => 'غير مصرح']);
        exit();
    }

    $action = $input['action'] ?? 'publish';

    // 1. Publish / Add Article
    if ($action === 'publish') {
        $newArt = [
            'id' => 'art-' . time(),
            'title' => htmlspecialchars(trim($input['title'] ?? '')),
            'category' => htmlspecialchars(trim($input['category'] ?? 'استشارات عامة')),
            'date' => date('Y-m-d'),
            'excerpt' => htmlspecialchars(trim($input['excerpt'] ?? '')),
            'content' => htmlspecialchars(trim($input['content'] ?? '')),
            'author' => 'المحامي سعد فراس أميل',
            'views' => 1
        ];

        if (empty($newArt['title']) || empty($newArt['content'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'العنوان والمحتوى مطلوبان']);
            exit();
        }

        array_unshift($articles, $newArt);
        file_put_contents($articlesFile, json_encode($articles, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        // Auto Ping IndexNow for immediate AI crawling
        try {
            $indexnowPayload = json_encode([
                'host' => 'saadamil.com',
                'key' => '09dfa077df5143ac933663f07e06aa0f',
                'keyLocation' => 'https://saadamil.com/09dfa077df5143ac933663f07e06aa0f.txt',
                'urlList' => ['https://saadamil.com/', 'https://saadamil.com/#articles']
            ]);
            $ctx = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => "Content-Type: application/json\r\n",
                    'content' => $indexnowPayload,
                    'timeout' => 3
                ]
            ]);
            @file_get_contents('https://api.indexnow.org/indexnow', false, $ctx);
        } catch (Exception $e) {}

        echo json_encode(['status' => 'success', 'message' => 'تم نشر المقال بنجاح وتنبيه محركات الذكاء الاصطناعي', 'article' => $newArt], JSON_UNESCAPED_UNICODE);
        exit();
    }

    // 2. Delete Article
    if ($action === 'delete') {
        $id = $input['id'] ?? '';
        $articles = array_values(array_filter($articles, function($a) use ($id) {
            return $a['id'] !== $id;
        }));
        file_put_contents($articlesFile, json_encode($articles, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo json_encode(['status' => 'success', 'message' => 'تم حذف المقال']);
        exit();
    }
}
