// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"bytes"
	"fmt"
	"time"

	"v.io/v23"
	"v.io/v23/context"
	"v.io/v23/rpc"
	"v.io/v23/security"
	"v.io/x/js.core/stress"
	"v.io/x/lib/vlog"
)

const payloadSize = 1000

type impl struct{}

func (s *impl) Echo(_ *context.T, _ rpc.ServerCall, payload []byte) ([]byte, error) {
	return payload, nil
}

func (s *impl) ServerEcho(ctx *context.T, _ rpc.ServerCall, totalTime time.Duration, name string) (stress.StressResults, error) {
	stub := stress.StressClient(name)
	payload := make([]byte, payloadSize)
	for i := range payload {
		payload[i] = byte(i & 0xff)
	}
	var iterations int64
	var res stress.StressResults
	start := time.Now()
	for {
		got, err := stub.Echo(ctx, payload)
		if err != nil {
			return res, err
		}
		if !bytes.Equal(got, payload) {
			return res, fmt.Errorf("Echo returned %v, but expected %v", got, payload)
		}
		iterations++

		if time.Since(start) >= totalTime {
			break
		}
	}
	duration := time.Since(start).Seconds()
	res.Iterations = iterations
	res.Qps = float64(iterations) / duration
	res.MsecsPerRpc = 1000 / res.Qps
	return res, nil
}

func startServer(ctx *context.T, listenSpec rpc.ListenSpec) rpc.Server {
	server, err := v23.NewServer(ctx)
	if err != nil {
		vlog.Fatalf("NewServer failed: %v", err)
	}
	_, err = server.Listen(listenSpec)
	if err != nil {
		vlog.Fatalf("Listen failed: %v", err)
	}

	s := impl{}
	if err := server.Serve("", stress.StressServer(&s), security.AllowEveryone()); err != nil {
		vlog.Fatalf("Serve failed: %v", err)
	}

	return server
}
