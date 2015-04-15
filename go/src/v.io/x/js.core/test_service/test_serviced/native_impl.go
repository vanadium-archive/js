// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"time"

	"v.io/v23/rpc"
	"v.io/x/js.core/test_service"
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
