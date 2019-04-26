<?php
header('Cache-Control: no-cache, must-revalidate');
header ('Pragma: no-cache');
header('Access-Control-Allow-Origin: *');

function getGUID()
{
    if (function_exists('com_create_guid')){
        return com_create_guid();
    }else{
        mt_srand((double)microtime()*10000);//optional for php 4.2.0 and up.
        $charid = strtoupper(md5(uniqid(rand(), true)));
        $hyphen = chr(45);// "-"
        $uuid = chr(123)// "{"
            .substr($charid, 0, 8).$hyphen
            .substr($charid, 8, 4).$hyphen
            .substr($charid,12, 4).$hyphen
            .substr($charid,16, 4).$hyphen
            .substr($charid,20,12)
            .chr(125);// "}"
        return $uuid;
    }
}

$html = $_POST["html"];

if (empty($html)) die();

//header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
//header("Cache-Control: post-check=0, pre-check=0", false);
//header("Pragma: no-cache");

$id = getGUID();

$infile  = "/var/www/html/pdf/$id.html";
$outfile = "/var/www/html/pdf/$id.pdf";

file_put_contents($infile, $html);

exec( "xvfb-run wkhtmltopdf $infile $outfile", $out, $ret);


//header('Content-Type: application/pdf');
//header('Content-Length: ' . filesize($outfile));

//readfile($outfile);

echo "$id.pdf";
?>
