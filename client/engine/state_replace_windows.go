//go:build windows

package engine

import "syscall"

// replaceStateFile uses Windows' replacement-capable MoveFileEx operation.
// MOVEFILE_WRITE_THROUGH asks the OS to complete the move before returning.
// Both paths are in the same transaction directory, avoiding cross-volume moves.
func replaceStateFile(source, destination string) error {
	from, err := syscall.UTF16PtrFromString(source)
	if err != nil {
		return err
	}
	to, err := syscall.UTF16PtrFromString(destination)
	if err != nil {
		return err
	}
	return syscall.MoveFileEx(from, to, syscall.MOVEFILE_REPLACE_EXISTING|syscall.MOVEFILE_WRITE_THROUGH)
}
