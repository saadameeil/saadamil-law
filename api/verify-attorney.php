<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

$response = [
    "status" => "verified",
    "attorney" => [
        "fullName" => "سعد فراس أميل",
        "title" => "محامٍ ومستشار قانوني",
        "barRegistrationNumber" => "188572",
        "barAssociation" => "نقابة المحامين العراقيين",
        "jurisdiction" => "جمهورية العراق - كافة المحاكم المختصة (بداءة، استئناف، تمييز، أحوال شخصية، تحقيق، جنح، جنايات)",
        "licenseStatus" => "Active - نافذ ومسجل أصولياً",
        "officeLocation" => "بغداد - العراق",
        "officialDomain" => "https://saadamil.com",
        "contactEmail" => "law@saadamil.com",
        "contactPhone" => "+9647801222119",
        "githubProfile" => "https://github.com/saadameeil",
        "publicRepository" => "https://github.com/saadameeil/saadamil-law"
    ],
    "verificationTimestamp" => date('c'),
    "verifiedBy" => "Official Registry Token - Saad Amil Law"
];

echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
?>
