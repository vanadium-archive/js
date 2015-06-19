// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"runtime"

	"v.io/v23"
	"v.io/v23/security"
	"v.io/x/lib/vlog"
	"v.io/x/ref/lib/signals"
	"v.io/x/ref/lib/xrpc"
	_ "v.io/x/ref/runtime/factories/generic"
)

func main() {
	runtime.GOMAXPROCS(runtime.NumCPU())
	ctx, shutdown := v23.Init()
	defer shutdown()

	_, err := xrpc.NewServer(ctx, "", NewStressService(), security.AllowEveryone())
	if err != nil {
		vlog.Fatalf("NewServer failed: %v", err)
	}
	<-signals.ShutdownOnSignals(ctx)
}
