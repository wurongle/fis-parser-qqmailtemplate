<?php

class FISJSONData extends FISData {
    public function __construct() {
        $this->datatype = 'json';
    }

    public function getData($tmpl) {
        $file = $this->getFile($tmpl);
        $ret = array();
        if (is_file($file)) {
            $ret = json_decode(file_get_contents($file), true);
            if ($ret === null) {
                $ret = array();
            }
        }
        // common test file
        $testFile = $this->getTestRootPath().'/common.json';
        if (is_file($testFile)) {

            $testRet = json_decode(file_get_contents($testFile), true);
            if ($testRet === null) {
                $testRet = array();
            }
            //print_r($testRet);
        }
        $result = array_merge($testRet,$ret);
        //print_r($testRet);

        return $result;
    }
}