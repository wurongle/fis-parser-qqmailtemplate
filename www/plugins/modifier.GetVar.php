<?php
function smarty_modifier_GetVar($key) {
    return $GLOBALS[$key];
}

?>