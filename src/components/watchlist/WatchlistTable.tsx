"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import WatchlistButton from "@/components/watchlist/WatchlistButton";
import { WATCHLIST_TABLE_HEADER } from "@/lib/constants";
import { cn, getChangeColorClass } from "@/lib/utils";

export function WatchlistTable({ watchlist }: WatchlistTableProps) {
  const router = useRouter();

  return (
    <Table className="scrollbar-hide-default watchlist-table">
      <TableHeader>
        <TableRow className="table-header-row">
          {WATCHLIST_TABLE_HEADER.map((label) => (
            <TableHead className="table-header" key={label}>
              {label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {watchlist.map((item) => (
          <TableRow
            key={item.symbol}
            className="table-row"
            onClick={() =>
              router.push(`/stocks/${encodeURIComponent(item.symbol)}`)
            }
          >
            <TableCell className="table-cell">
              <WatchlistButton
                symbol={item.symbol}
                company={item.company}
                isInWatchlist={true}
                showTrashIcon={true}
                type="icon"
              />
            </TableCell>
            <TableCell className="pl-4 table-cell">{item.company}</TableCell>
            <TableCell className="table-cell">{item.symbol}</TableCell>
            <TableCell className="table-cell">
              {item.priceFormatted || "—"}
            </TableCell>
            <TableCell
              className={cn(
                "table-cell",
                getChangeColorClass(item.changePercent),
              )}
            >
              {item.changeFormatted || "—"}
            </TableCell>
            <TableCell className="table-cell">
              {item.marketCap || "—"}
            </TableCell>
            <TableCell className="table-cell">{item.peRatio || "—"}</TableCell>
            <TableCell>
              <Button className="add-alert">Add Alert</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
