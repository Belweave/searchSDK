package searchsdk

import "regexp"

var languagePattern = regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9_-]{0,34}$`)
var categoryPattern = regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9 _-]{0,63}$`)
