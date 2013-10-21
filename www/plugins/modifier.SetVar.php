<?php
function smarty_modifier_SetVar($key,$value) {
    $GLOBALS[$key] = $value;
}

?>