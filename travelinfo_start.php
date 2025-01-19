<?php

// 실행할 Node.js 파일 목록 (순서대로 입력)
$nodejsFiles = array(
    "0_keyword_pick.js",
    "1_linktotext.js",
    "2_google_search.js",
    "3_analyze_step1.js",
    "4_outline_step2.js",
    "5_contents_step3.js",
    "6_etc_article_step4.js",
    "7_img_pixabay.js",
    "8_posting_WP.js"
);

// 각 파일 실행 간의 딜레이 (초)
$fileDelay = 10; // 10 seconds delay between files
$errorDelay = 300; // 5 minutes delay after an error

// 현재 실행 중인 파일 인덱스
$currentFileIndex = 0;

// 작업 디렉토리 설정 (필요에 따라 변경)
$workDir = "/var/www/auto/travelinfo";

while (true) {
    for (; $currentFileIndex < count($nodejsFiles); $currentFileIndex++) {
        $fileName = $nodejsFiles[$currentFileIndex];
        $filePath = $workDir . "/" . $fileName;

        // 현재 실행 중인 파일 표시
        echo "$fileName 작업 시작 \n";

        // Node.js 실행 명령어 생성
        $command = "node " . $filePath;

        // 명령어 실행 및 오류 처리
        $descriptorspec = array(
            0 => array("pipe", "r"),
            1 => array("pipe", "w"),
            2 => array("pipe", "w")
        );

        $process = proc_open($command, $descriptorspec, $pipes);

        if (is_resource($process)) {
            $stdout = stream_get_contents($pipes[1]);
            $stderr = stream_get_contents($pipes[2]);

            fclose($pipes[1]);
            fclose($pipes[2]);

            $return_value = proc_close($process);

            if ($return_value != 0) {
                // 오류 발생 시 로그 출력 및 딜레이 후 처음부터 재시작
                echo "** $fileName 파일 실행 오류 발생: $stderr ** \n";
                echo "$errorDelay 초 후 처음부터 다시 시작합니다...\n";
                sleep($errorDelay);
                $currentFileIndex = -1; // 처음부터 시작하기 위해 -1로 설정
                break;
            } else {
                // 정상 실행 시 로그 출력
                echo "** $fileName 파일 실행 완료! ** \n";
                sleep($fileDelay);
            }
        } else {
            echo "** $fileName 파일 실행 실패! 프로세스를 열 수 없습니다. ** \n";
            echo "$errorDelay 초 후 처음부터 다시 시작합니다...\n";
            sleep($errorDelay);
            $currentFileIndex = -1; // 처음부터 시작하기 위해 -1로 설정
            break;
        }
    }

    // 모든 작업이 정상적으로 완료된 경우
    if ($currentFileIndex === count($nodejsFiles)) {
        echo "모든 작업이 완료되었습니다. 스크립트를 종료합니다.\n";
        break;
    }
}
