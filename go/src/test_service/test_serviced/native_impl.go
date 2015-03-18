package main

import (
	"test_service"
	"time"
	"v.io/v23/rpc"
)

func NewNativeTest() test_service.NativeTestServerMethods {
	return &nativeTest{}
}

type nativeTest struct{}

func (*nativeTest) PassTime(_ rpc.ServerCall, t time.Time) (time.Time, error) {
	return t, nil
}

func (*nativeTest) PassError(_ rpc.ServerCall, e error) error {
	return e
}
