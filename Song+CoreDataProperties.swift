//
//  Song+CoreDataProperties.swift
//  SolPlayer
//
//  Created by Morioka Naoya on H28/06/19.
//  Copyright © 平成28年 Morioka Naoya. All rights reserved.
//
//  Choose "Create NSManagedObject Subclass…" from the Core Data editor menu
//  to delete and recreate this implementation file for your updated model.
//  ※persistentID、playlist以外は未使用
//

import Foundation
import CoreData

extension Song {
    
    @NSManaged var persistentID: NSNumber?
    @NSManaged var playlist: NSNumber?
    @NSManaged var trackNumber: NSNumber?
    @NSManaged var title: String?
    @NSManaged var mediaType: String?
    @NSManaged var diskNumber: NSNumber?
    @NSManaged var rating: String?
    @NSManaged var releaseDate: NSDate?
    @NSManaged var artwork: NSData?
    @NSManaged var albumTitle: String?
    @NSManaged var albumArtist: String?
    @NSManaged var artist: String?
    @NSManaged var assetURL: String?

}
