// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Command test_serviced is an implementation of the test_service service.
package main

import (
	"fmt"
	"log"

	"v.io/v23"
	"v.io/x/ref/lib/flags"
	"v.io/x/ref/lib/signals"
	"v.io/x/ref/lib/xrpc"
	_ "v.io/x/ref/runtime/factories/generic"
)

func main() {
	flags.SetDefaultHostPort("127.0.0.1:0")
	ctx, shutdown := v23.Init()
	defer shutdown()

	s, err := xrpc.NewDispatchingServer(ctx, "test_service", NewDispatcher())
	if err != nil {
		log.Fatalf("failure creating server: %v", err)
	}
	endpoint := s.Status().Endpoints[0]
	fmt.Printf("Listening at: %v\n", endpoint)
	<-signals.ShutdownOnSignals(ctx)
}
