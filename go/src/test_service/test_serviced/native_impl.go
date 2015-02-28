package main

import (
	"test_service"
	"time"
	"v.io/v23/ipc"
)

func NewNativeTest() test_service.NativeTestServerMethods {
	return &nativeTest{}
}

type nativeTest struct{}

func (*nativeTest) PassTime(_ ipc.ServerCall, t time.Time) (time.Time, error) {
	return t, nil
}

func (*nativeTest) PassError(_ ipc.ServerCall, e error) error {
	return e
}
