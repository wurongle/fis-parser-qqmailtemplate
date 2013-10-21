<?php
function smarty_modifier_AppendVar($key,$value) {
    $GLOBALS[$key] .= $value;
}

?>