//go:build !windows

package engine

import "os"

// replaceStateFile atomically replaces the destination on platforms where
// os.Rename supports replacement within the same filesystem.
func replaceStateFile(source, destination string) error {
	return os.Rename(source, destination)
}
